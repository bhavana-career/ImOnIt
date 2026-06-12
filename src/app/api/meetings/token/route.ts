import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { ObjectId } from "mongodb";
import { SignJWT } from "jose";

export async function GET(request: NextRequest) {
  try {
    const activeUser = await getActiveUser(request);
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get("meetingId");
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

    if (meeting.status === "scheduled") {
      await db.collection("meetings").updateOne(
        { _id: meetingObjectId },
        { $set: { status: "active" } }
      );
    }

    // 2. Verify user membership in this Hub
    const userObjectId = new ObjectId(activeUser.id);
    const membership = await db.collection("memberships").findOne({
      hubId: meeting.hubId,
      userId: userObjectId,
      status: "approved",
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied. You are not a member of this Hub." }, { status: 403 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    const identity = activeUser.email.toLowerCase();
    const name = activeUser.name;

    // 3. Fall back to mock if LiveKit env variables are not fully configured
    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json({
        success: true,
        mock: true,
        token: `mock_token_${Date.now()}`,
        roomName: meeting.livekitRoomId,
        identity,
        name,
        livekitUrl: "",
      });
    }

    // 4. Generate standard LiveKit JWT
    const secret = new TextEncoder().encode(apiSecret);
    const token = await new SignJWT({
      video: {
        roomCreate: false,
        roomJoin: true,
        room: meeting.livekitRoomId,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
      metadata: JSON.stringify({ email: activeUser.email, name: activeUser.name }),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(apiKey)
      .setSubject(identity)
      .setExpirationTime("6h")
      .setIssuedAt()
      .sign(secret);

    return NextResponse.json({
      success: true,
      mock: false,
      token,
      roomName: meeting.livekitRoomId,
      identity,
      name,
      livekitUrl,
    });

  } catch (err: any) {
    console.error("Error generating meeting token:", err);
    return NextResponse.json({ error: err.message || "Failed to generate meeting token." }, { status: 500 });
  }
}
