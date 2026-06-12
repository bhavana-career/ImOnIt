import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { sendInvitationEmail } from "@/lib/email";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import { getAppUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const activeUser = await getActiveUser(request);
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { email, hubId, customMessage } = await request.json();
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

    // Fetch Hub details
    const hub = await db.collection("hubs").findOne({ _id: hubObjectId });
    if (!hub) {
      return NextResponse.json({ error: "Hub not found." }, { status: 404 });
    }

    // Check if user is already a member
    const existingMember = await db.collection("memberships").findOne({
      hubId: hubObjectId,
      email: cleanEmail,
    });
    if (existingMember) {
      return NextResponse.json({ error: "This user is already a member or request is pending." }, { status: 400 });
    }

    // 2. Check if user exists to link account
    const invitedUser = await db.collection("users").findOne({ email: cleanEmail });

    // 3. Generate token and invitation document
    const token = crypto.randomBytes(32).toString("hex");

    await db.collection("invitations").insertOne({
      hubId: hubObjectId,
      email: cleanEmail,
      token,
      invitedBy: senderObjectId,
      status: "sent",
      invitedUserId: invitedUser ? invitedUser._id : undefined,
      createdAt: new Date(),
    });

    // 4. Send email
    const appUrl = getAppUrl(request);
    const inviteLink = `${appUrl}/invitation?token=${token}`;

    await sendInvitationEmail({
      to: cleanEmail,
      ownerName: activeUser.name,
      ownerImage: activeUser.image,
      hubName: hub.hubName,
      hubDescription: hub.hubDescription,
      hubImage: hub.hubImage,
      inviteLink,
      customMessage,
    });

    return NextResponse.json({ success: true, message: "Invitation sent successfully!" });

  } catch (err: any) {
    console.error("Error sending invitation:", err);
    return NextResponse.json({ error: err.message || "Failed to send invitation." }, { status: 500 });
  }
}
