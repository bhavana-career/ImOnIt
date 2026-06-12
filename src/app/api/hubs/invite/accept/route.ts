import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { sendJoinRequestEmail } from "@/lib/email";
import { ObjectId } from "mongodb";
import { getAppUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const activeUser = await getActiveUser(request);
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "Invitation token is required." }, { status: 400 });
    }

    const db = await getDb();
    const userObjectId = new ObjectId(activeUser.id);

    // 1. Find the invitation
    const invitation = await db.collection("invitations").findOne({
      token: token,
      status: "sent",
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid or expired invitation token." }, { status: 404 });
    }

    // Check expiration (7 days)
    const ageMs = Date.now() - new Date(invitation.createdAt).getTime();
    if (ageMs > 7 * 24 * 60 * 60 * 1000) {
      await db.collection("invitations").updateOne(
        { _id: invitation._id },
        { $set: { status: "expired", updatedAt: new Date() } }
      );
      return NextResponse.json({ error: "This invitation has expired." }, { status: 400 });
    }

    // Fetch Hub details
    const hub = await db.collection("hubs").findOne({ _id: invitation.hubId });
    if (!hub) {
      return NextResponse.json({ error: "Associated Hub not found." }, { status: 404 });
    }

    // 2. Link invitation to user and update status
    await db.collection("invitations").updateOne(
      { _id: invitation._id },
      {
        $set: {
          status: "pending_approval",
          invitedUserId: userObjectId,
          updatedAt: new Date(),
        }
      }
    );

    // 3. Create memberships entry
    // Check if membership already exists (active or pending)
    const existingMembership = await db.collection("memberships").findOne({
      hubId: invitation.hubId,
      userId: userObjectId,
    });

    if (existingMembership) {
      const statusLower = existingMembership.status?.toLowerCase();
      if (statusLower === "approved") {
        return NextResponse.json({
          success: true,
          message: "You are already a member of this Hub.",
          hubId: hub._id.toString(),
          hubName: hub.hubName,
        });
      }
      return NextResponse.json({
        success: true,
        message: "Your request is already pending Owner approval.",
        hubId: hub._id.toString(),
        hubName: hub.hubName,
      });
    }

    await db.collection("memberships").insertOne({
      hubId: invitation.hubId,
      userId: userObjectId,
      email: activeUser.email.toLowerCase(),
      role: "member",
      status: "Pending",
      invitedBy: invitation.invitedBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4. Notify Owner of this Hub
    const ownerUser = await db.collection("users").findOne({ _id: hub.ownerId });
    if (ownerUser) {
      // 4a. Create website notification for Owner
      await db.collection("notifications").insertOne({
        userId: hub.ownerId,
        type: "invitation_received",
        title: "New Join Request",
        message: `${activeUser.name} accepted the invitation and is pending approval to join ${hub.hubName}.`,
        read: false,
        metadata: {
          hubId: hub._id.toString(),
          memberId: userObjectId.toString(),
        },
        createdAt: new Date(),
      });

      // 4b. Send Email Notification to Owner
      const appUrl = getAppUrl(request);
      const dashboardLink = `${appUrl}/dashboard`;

      await sendJoinRequestEmail({
        to: ownerUser.email,
        ownerName: ownerUser.name,
        userName: activeUser.name,
        userEmail: activeUser.email,
        hubName: hub.hubName,
        dashboardLink,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Invitation accepted. Request is pending Owner approval.",
      hubId: hub._id.toString(),
      hubName: hub.hubName,
    });

  } catch (err: any) {
    console.error("Error accepting invitation:", err);
    return NextResponse.json({ error: err.message || "Failed to accept invitation." }, { status: 500 });
  }
}
