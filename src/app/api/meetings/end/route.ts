import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const activeUser = await getActiveUser();
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { meetingId } = await request.json();
    if (!meetingId) {
      return NextResponse.json({ error: "Meeting ID is required." }, { status: 400 });
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
      status: "approved",
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized. Only the Hub Owner can end meetings." }, { status: 403 });
    }

    // 3. Update meeting status
    await db.collection("meetings").updateOne(
      { _id: meetingObjectId },
      { $set: { status: "ended" } }
    );

    return NextResponse.json({ success: true, message: "Meeting has been ended successfully." });

  } catch (err: any) {
    console.error("Error ending meeting:", err);
    return NextResponse.json({ error: err.message || "Failed to end meeting." }, { status: 500 });
  }
}
