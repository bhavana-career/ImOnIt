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

    const { meetingId, text, userEmail, livekitIdentity } = await request.json();
    if (!meetingId || !text || !userEmail || !livekitIdentity) {
      return NextResponse.json({ error: "Missing required fields (meetingId, text, userEmail, livekitIdentity)." }, { status: 400 });
    }

    const cleanUserEmail = userEmail.trim().toLowerCase();
    const cleanSessionEmail = activeUser.email.toLowerCase();

    // 1. Bulletproof identity check: session email MUST match both userEmail and livekitIdentity
    if (cleanSessionEmail !== cleanUserEmail || cleanSessionEmail !== livekitIdentity.trim().toLowerCase()) {
      return NextResponse.json({ error: "Forbidden. Speaker identity mismatch." }, { status: 403 });
    }

    const db = await getDb();
    const meetingObjectId = new ObjectId(meetingId);

    // 2. Fetch meeting
    const meeting = await db.collection("meetings").findOne({ _id: meetingObjectId });
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    }

    // 3. Verify user membership in the Hub
    const userObjectId = new ObjectId(activeUser.id);
    const membership = await db.collection("memberships").findOne({
      hubId: meeting.hubId,
      userId: userObjectId,
      status: "approved",
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied. You are not a member of this Hub." }, { status: 403 });
    }

    // 4. Append chunk to meetingTranscripts collection
    const chunk = {
      speaker: activeUser.name,
      userEmail: cleanUserEmail,
      livekitIdentity: livekitIdentity.trim(),
      text: text.trim(),
      timestamp: new Date(),
    };

    await db.collection("meetingTranscripts").updateOne(
      { meetingId: meetingObjectId },
      {
        $push: { chunks: chunk } as any,
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, message: "Transcript chunk appended successfully!" });

  } catch (err: any) {
    console.error("Error appending transcript:", err);
    return NextResponse.json({ error: err.message || "Failed to append transcript chunk." }, { status: 500 });
  }
}
