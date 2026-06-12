import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { sendMeetingScheduledEmail } from "@/lib/email";
import { ObjectId } from "mongodb";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const activeUser = await getActiveUser();
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { hubId, title, description, scheduledAt } = await request.json();
    if (!hubId || !title || !scheduledAt) {
      return NextResponse.json({ error: "Hub ID, Title, and Schedule Date are required." }, { status: 400 });
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: "Invalid schedule date." }, { status: 400 });
    }

    if (scheduledDate.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Meeting must be scheduled for a future date and time." }, { status: 400 });
    }

    const db = await getDb();
    const ownerObjectId = new ObjectId(activeUser.id);
    const hubObjectId = new ObjectId(hubId);

    // 1. Verify user is Hub Owner
    const membership = await db.collection("memberships").findOne({
      hubId: hubObjectId,
      userId: ownerObjectId,
      role: "owner",
      status: { $in: ["Approved", "approved"] },
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized. Only the Hub Owner can schedule meetings." }, { status: 403 });
    }

    const hub = await db.collection("hubs").findOne({ _id: hubObjectId });
    if (!hub) {
      return NextResponse.json({ error: "Hub not found." }, { status: 404 });
    }

    // 2. Generate a unique LiveKit Room ID
    const livekitRoomId = `room_${crypto.randomBytes(8).toString("hex")}`;

    const newMeeting = {
      hubId: hubObjectId,
      title: title.trim(),
      description: description ? description.trim() : "",
      scheduledAt: scheduledDate,
      status: "scheduled" as const,
      livekitRoomId,
      createdAt: new Date(),
    };

    const result = await db.collection("meetings").insertOne(newMeeting);

    // 3. Find all approved members to notify
    const approvedMembers = await db.collection("memberships")
      .find({ hubId: hubObjectId, status: { $in: ["Approved", "approved"] } })
      .toArray();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const meetingLink = `${appUrl}/dashboard`;

    // 4. Create website notifications and send emails
    const notificationPromises = approvedMembers.map(async (m) => {
      // Create website notification (excluding owner who scheduled it)
      if (m.userId.toString() !== activeUser.id) {
        await db.collection("notifications").insertOne({
          userId: m.userId,
          type: "meeting_scheduled",
          title: "New Meeting Scheduled",
          message: `${activeUser.name} scheduled a new meeting: "${title.trim()}" in ${hub.hubName}.`,
          read: false,
          metadata: {
            hubId: hubId,
            meetingId: result.insertedId.toString(),
          },
          createdAt: new Date(),
        });
      }

      // Send Email Notification
      try {
        await sendMeetingScheduledEmail({
          to: m.email,
          ownerName: activeUser.name,
          hubName: hub.hubName,
          meetingTitle: title.trim(),
          meetingDescription: description,
          scheduledTime: scheduledDate.toLocaleString(),
          meetingLink,
        });
      } catch (emailErr) {
        console.error(`Failed to send scheduling email to ${m.email}:`, emailErr);
      }
    });

    await Promise.all(notificationPromises);

    return NextResponse.json({
      success: true,
      message: "Meeting scheduled successfully!",
      meetingId: result.insertedId.toString(),
    });

  } catch (err: any) {
    console.error("Error scheduling meeting:", err);
    return NextResponse.json({ error: err.message || "Failed to schedule meeting." }, { status: 500 });
  }
}
