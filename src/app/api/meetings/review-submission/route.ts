import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { sendSubmissionApprovedEmail, sendSubmissionRejectedEmail } from "@/lib/email";
import { ObjectId } from "mongodb";
import { getAppUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const appUrl = getAppUrl(request);
    const activeUser = await getActiveUser(request);
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { vaultMeetingId, taskIndex, action, feedback } = await request.json();
    if (!vaultMeetingId || taskIndex === undefined || !action) {
      return NextResponse.json({ error: "Missing required fields (vaultMeetingId, taskIndex, action)." }, { status: 400 });
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action. Must be 'approve' or 'reject'." }, { status: 400 });
    }

    if (action === "reject" && (!feedback || !feedback.trim())) {
      return NextResponse.json({ error: "Feedback is required when rejecting a submission." }, { status: 400 });
    }

    const db = await getDb();
    const vaultMeetingObjectId = new ObjectId(vaultMeetingId);

    // 1. Fetch Vault Meeting record
    const vaultMeeting = await db.collection("vaultMeetings").findOne({ _id: vaultMeetingObjectId });
    if (!vaultMeeting) {
      return NextResponse.json({ error: "Vault meeting record not found." }, { status: 404 });
    }

    // 2. Verify user is Hub Owner
    const userObjectId = new ObjectId(activeUser.id);
    const membership = await db.collection("memberships").findOne({
      hubId: vaultMeeting.hubId,
      userId: userObjectId,
      role: "owner",
      status: { $in: ["Approved", "approved"] },
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized. Only the Hub Owner can review submissions." }, { status: 403 });
    }

    // 3. Find submission document
    const query = { vaultMeetingId: vaultMeetingObjectId, taskIndex: Number(taskIndex) };
    const submission = await db.collection("submissions").findOne(query);
    if (!submission) {
      return NextResponse.json({ error: "Submission record not found." }, { status: 404 });
    }

    const attemptsCount = submission.attempts.length;
    if (attemptsCount === 0) {
      return NextResponse.json({ error: "No submission attempts found." }, { status: 400 });
    }

    const lastAttemptIndex = attemptsCount - 1;

    // 4. Update attempts list with audit details
    const statusVal = action === "approve" ? "approved" : "rejected";
    const reviewedAt = new Date();

    const updateAttemptFields = {
      [`attempts.${lastAttemptIndex}.status`]: statusVal,
      [`attempts.${lastAttemptIndex}.feedback`]: feedback ? feedback.trim() : "",
      [`attempts.${lastAttemptIndex}.reviewedAt`]: reviewedAt,
      [`attempts.${lastAttemptIndex}.reviewedBy`]: userObjectId,
      status: statusVal,
      updatedAt: reviewedAt,
    };

    await db.collection("submissions").updateOne(query, { $set: updateAttemptFields });

    // 5. Update assignment status inside vaultMeeting assignments array
    const updatePath = `assignments.${taskIndex}.status`;
    await db.collection("vaultMeetings").updateOne(
      { _id: vaultMeetingObjectId },
      { $set: { [updatePath]: statusVal, updatedAt: new Date() } }
    );

    // 6. Notify assignee member
    const assigneeEmail = submission.assigneeEmail.trim().toLowerCase();
    const memberMembership = await db.collection("memberships").findOne({
      hubId: vaultMeeting.hubId,
      email: assigneeEmail,
      status: { $in: ["Approved", "approved"] },
    });

    const hub = await db.collection("hubs").findOne({ _id: vaultMeeting.hubId });

    if (memberMembership && hub) {
      // Create notification
      const notifType = action === "approve" ? "submission_approved" : "submission_rejected";
      const notifTitle = action === "approve" ? "Submission Approved" : "Submission Rejected";
      const notifMsg = action === "approve" 
        ? `Your submission for task "${submission.task.slice(0, 40)}..." in ${hub.hubName} was APPROVED!`
        : `Your submission for task "${submission.task.slice(0, 40)}..." in ${hub.hubName} was REJECTED. Feedback: "${feedback.slice(0, 50)}..."`;

      await db.collection("notifications").insertOne({
        userId: memberMembership.userId,
        type: notifType,
        title: notifTitle,
        message: notifMsg,
        read: false,
        metadata: {
          hubId: hub._id.toString(),
          vaultMeetingId: vaultMeetingId,
          taskIndex: Number(taskIndex),
          feedback: feedback || "",
        },
        createdAt: new Date(),
      });

      // Send Email
      try {
        if (action === "approve") {
          await sendSubmissionApprovedEmail({
            to: assigneeEmail,
            memberName: submission.assigneeName || assigneeEmail.split("@")[0],
            hubName: hub.hubName,
            meetingTitle: vaultMeeting.title,
            task: submission.task,
            dashboardLink: `${appUrl}/dashboard`,
          });
        } else {
          await sendSubmissionRejectedEmail({
            to: assigneeEmail,
            memberName: submission.assigneeName || assigneeEmail.split("@")[0],
            hubName: hub.hubName,
            meetingTitle: vaultMeeting.title,
            task: submission.task,
            feedback: feedback.trim(),
            dashboardLink: `${appUrl}/dashboard`,
          });
        }
      } catch (emailErr) {
        console.error("Failed to send review outcome email:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Submission successfully ${action}d!`,
    });

  } catch (err: any) {
    console.error("Error reviewing submission:", err);
    return NextResponse.json({ error: err.message || "Failed to review submission." }, { status: 500 });
  }
}
