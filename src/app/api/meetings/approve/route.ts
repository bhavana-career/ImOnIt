import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { sendAssignmentNotificationEmail } from "@/lib/email";
import { ObjectId } from "mongodb";
import { getAppUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const activeUser = await getActiveUser();
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { meetingId, title, date, duration, summary, assignments, score } = await request.json();
    if (!meetingId || !title || !summary || !assignments || !score) {
      return NextResponse.json({ error: "Missing required fields for approval." }, { status: 400 });
    }

    const db = await getDb();
    const meetingObjectId = new ObjectId(meetingId);

    // 1. Fetch meeting
    const meeting = await db.collection("meetings").findOne({ _id: meetingObjectId });
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    }

    // 2. Verify user is Hub Owner
    const userObjectId = new ObjectId(activeUser.id);
    const membership = await db.collection("memberships").findOne({
      hubId: meeting.hubId,
      userId: userObjectId,
      role: "owner",
      status: { $in: ["Approved", "approved"] },
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized. Only the Hub Owner can approve meeting records." }, { status: 403 });
    }

    const hub = await db.collection("hubs").findOne({ _id: meeting.hubId });
    if (!hub) {
      return NextResponse.json({ error: "Hub not found." }, { status: 404 });
    }

    // 3. Fetch final transcript chunks to save alongside the record
    const transcriptDoc = await db.collection("meetingTranscripts").findOne({ meetingId: meetingObjectId });
    const transcriptChunks = (transcriptDoc?.chunks || []).map((c: any) => ({
      speaker: c.speaker,
      text: c.text,
      email: c.userEmail,
    }));

    // 4. Create Version 1 snapshot
    const initialVersion = {
      versionNumber: 1,
      editedBy: userObjectId,
      editedAt: new Date(),
      changeReason: "Initial approval",
      summary: JSON.parse(JSON.stringify(summary)),
      assignments: JSON.parse(JSON.stringify(assignments)),
    };

    const vaultMeeting = {
      meetingId: meetingObjectId,
      hubId: meeting.hubId,
      title: title.trim(),
      date: new Date(date || meeting.scheduledAt),
      duration: duration || 0,
      transcript: transcriptChunks,
      summary,
      assignments,
      score,
      versions: [initialVersion],
      activeVersionNumber: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to vaultMeetings collection
    const result = await db.collection("vaultMeetings").insertOne(vaultMeeting);

    // 5. Delete temporary draft & end meeting in meetings collection
    await db.collection("meetingDrafts").deleteOne({ meetingId: meetingObjectId });
    await db.collection("meetings").updateOne(
      { _id: meetingObjectId },
      { $set: { status: "ended" } }
    );

    // 6. Notify assigned members (Only send each member their OWN assignments!)
    const appUrl = getAppUrl(request);
    const dashboardLink = `${appUrl}/dashboard`;

    // Loop through assignments and notify
    const notifyPromises = assignments.map(async (assign: any) => {
      const cleanEmail = assign.memberEmail.trim().toLowerCase();

      // Find user in memberships of this hub to get userId
      const memberMembership = await db.collection("memberships").findOne({
        hubId: meeting.hubId,
        email: cleanEmail,
        status: { $in: ["Approved", "approved"] },
      });

      if (memberMembership) {
        // Create website notification for this user
        await db.collection("notifications").insertOne({
          userId: memberMembership.userId,
          type: "assignment_assigned",
          title: "New Task Assignment",
          message: `You have been assigned a task: "${assign.task}" in ${hub.hubName} (from meeting "${title.trim()}").`,
          read: false,
          metadata: {
            hubId: hub._id.toString(),
            meetingId: meetingId,
            vaultMeetingId: result.insertedId.toString(),
            task: assign.task,
            deadline: assign.deadline,
          },
          createdAt: new Date(),
        });

        // Send Email: Only contains their own task!
        try {
          await sendAssignmentNotificationEmail({
            to: cleanEmail,
            memberName: assign.memberName || cleanEmail.split("@")[0],
            hubName: hub.hubName,
            meetingTitle: title.trim(),
            task: assign.task,
            deadline: assign.deadline,
            dashboardLink,
            isUpdate: false,
            overview: summary.overview,
            duration: duration,
            date: date,
            outcome: summary.outcome,
          });
        } catch (emailErr) {
          console.error(`Failed to send assignment email to ${cleanEmail}:`, emailErr);
        }
      }
    });

    await Promise.all(notifyPromises);

    return NextResponse.json({
      success: true,
      message: "Meeting record approved and stored in Vault!",
      vaultMeetingId: result.insertedId.toString(),
    });

  } catch (err: any) {
    console.error("Error approving meeting:", err);
    return NextResponse.json({ error: err.message || "Failed to approve meeting." }, { status: 500 });
  }
}
