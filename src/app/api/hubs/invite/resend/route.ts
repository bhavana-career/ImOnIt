import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { sendInvitationEmail } from "@/lib/email";
import { ObjectId } from "mongodb";
import { getAppUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const activeUser = await getActiveUser();
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { email, hubId } = await request.json();
    if (!email || !hubId) {
      return NextResponse.json({ error: "Email and Hub ID are required." }, { status: 400 });
    }

    const db = await getDb();
    const senderObjectId = new ObjectId(activeUser.id);
    const hubObjectId = new ObjectId(hubId);
    const cleanEmail = email.trim().toLowerCase();

    // 1. Verify that sender is Owner of this Hub
    const membership = await db.collection("memberships").findOne({
      hubId: hubObjectId,
      userId: senderObjectId,
      role: "owner",
      status: "approved",
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized. Owner permissions required." }, { status: 403 });
    }

    // 2. Find sent invitation
    const invitation = await db.collection("invitations").findOne({
      hubId: hubObjectId,
      email: cleanEmail,
      status: "sent",
    });

    if (!invitation) {
      return NextResponse.json({ error: "No pending invitation found for this user." }, { status: 404 });
    }

    // Fetch Hub details
    const hub = await db.collection("hubs").findOne({ _id: hubObjectId });
    if (!hub) {
      return NextResponse.json({ error: "Hub not found." }, { status: 404 });
    }

    // 3. Resend Email
    const appUrl = getAppUrl(request);
    const inviteLink = `${appUrl}/invitation?token=${invitation.token}`;

    await sendInvitationEmail({
      to: cleanEmail,
      ownerName: activeUser.name,
      ownerImage: activeUser.image,
      hubName: hub.hubName,
      hubDescription: hub.hubDescription,
      hubImage: hub.hubImage,
      inviteLink,
    });

    return NextResponse.json({ success: true, message: "Invitation resent successfully!" });

  } catch (err: any) {
    console.error("Error resending invitation:", err);
    return NextResponse.json({ error: err.message || "Failed to resend invitation." }, { status: 500 });
  }
}
