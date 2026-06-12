import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { sendSubmissionAlertEmail } from "@/lib/email";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const activeUser = await getActiveUser(request);
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { vaultMeetingId, taskIndex, title, description, attachments } = await request.json();
    if (!vaultMeetingId || taskIndex === undefined || !description) {
      return NextResponse.json({ error: "Missing required fields (vaultMeetingId, taskIndex, description)." }, { status: 400 });
    }

    const db = await getDb();
    const vaultMeetingObjectId = new ObjectId(vaultMeetingId);

    // 1. Fetch Vault Meeting record
    const vaultMeeting = await db.collection("vaultMeetings").findOne({ _id: vaultMeetingObjectId });
    if (!vaultMeeting) {
      return NextResponse.json({ error: "Vault meeting record not found." }, { status: 404 });
    }

    // 2. Fetch the assignment details
    const assignments = vaultMeeting.assignments || [];
    const assignment = assignments[taskIndex];
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    const cleanUserEmail = activeUser.email.trim().toLowerCase();
    const cleanAssigneeEmail = assignment.memberEmail.trim().toLowerCase();

    // 3. Verify user is the assignee
    if (cleanUserEmail !== cleanAssigneeEmail) {
      return NextResponse.json({ error: "Forbidden. You are not assigned to this task." }, { status: 403 });
    }

    // 4. Find or create the submission document
    const query = { vaultMeetingId: vaultMeetingObjectId, taskIndex: Number(taskIndex) };
    const existingSubmission = await db.collection("submissions").findOne(query);

    const attemptNumber = existingSubmission ? (existingSubmission.attempts.length + 1) : 1;
    const newAttempt = {
      attemptNumber,
      title: title ? title.trim() : "",
      description: description.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
      submittedAt: new Date(),
      status: "pending_review",
    };

    if (existingSubmission) {
      await db.collection("submissions").updateOne(
        query,
        {
          $set: {
            status: "pending_review",
            updatedAt: new Date(),
          },
          $push: { attempts: newAttempt } as any,
        }
      );
    } else {
      const newSubmissionDoc = {
        hubId: vaultMeeting.hubId,
        vaultMeetingId: vaultMeetingObjectId,
        taskIndex: Number(taskIndex),
        assigneeEmail: cleanAssigneeEmail,
        assigneeName: assignment.memberName,
        task: assignment.task,
        deadline: assignment.deadline,
        status: "pending_review",
        attempts: [newAttempt],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection("submissions").insertOne(newSubmissionDoc);
    }

    // 5. Update status inside vaultMeetings assignment entry
    const updatePath = `assignments.${taskIndex}.status`;
    await db.collection("vaultMeetings").updateOne(
      { _id: vaultMeetingObjectId },
      { $set: { [updatePath]: "pending_review", updatedAt: new Date() } }
    );

    // 6. Notify Hub Owner
    const ownerMembership = await db.collection("memberships").findOne({
      hubId: vaultMeeting.hubId,
      role: "owner",
      status: { $in: ["Approved", "approved"] },
    });

    const hub = await db.collection("hubs").findOne({ _id: vaultMeeting.hubId });

    if (ownerMembership && hub) {
      // Create website notification for Owner
      await db.collection("notifications").insertOne({
        userId: ownerMembership.userId,
        type: "submission_received",
        title: "New Submission Received",
        message: `${activeUser.name} submitted proof of work for task: "${assignment.task.slice(0, 50)}..." in ${hub.hubName}.`,
        read: false,
        metadata: {
          hubId: hub._id.toString(),
          vaultMeetingId: vaultMeetingId,
          taskIndex: Number(taskIndex),
          memberName: activeUser.name,
        },
        createdAt: new Date(),
      });

      // Send Branded Email
      try {
        await sendSubmissionAlertEmail({
          to: ownerMembership.email,
          ownerName: ownerMembership.name || "Owner",
          memberName: activeUser.name,
          hubName: hub.hubName,
          meetingTitle: vaultMeeting.title,
          task: assignment.task,
          attemptNumber,
        });
      } catch (emailErr) {
        console.error("Failed to send submission alert email:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Proof of work submitted successfully!",
      attemptNumber,
    });

  } catch (err: any) {
    console.error("Error submitting task:", err);
    return NextResponse.json({ error: err.message || "Failed to submit task." }, { status: 500 });
  }
}
