import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { sendRejectionEmail } from "@/lib/email";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const activeUser = await getActiveUser(request);
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { hubId, userId } = await request.json();
    if (!hubId || !userId) {
      return NextResponse.json({ error: "Hub ID and User ID are required." }, { status: 400 });
    }

    const db = await getDb();
    const ownerObjectId = new ObjectId(activeUser.id);
    const targetUserObjectId = new ObjectId(userId);
    const hubObjectId = new ObjectId(hubId);

    // 1. Verify that activeUser is Owner of this Hub
    const ownerMembership = await db.collection("memberships").findOne({
      hubId: hubObjectId,
      userId: ownerObjectId,
      role: "owner",
      status: { $in: ["Approved", "approved"] },
    });

    if (!ownerMembership) {
      return NextResponse.json({ error: "Unauthorized. Owner permissions required." }, { status: 403 });
    }

    // 2. Fetch target user and Hub details
    const targetUser = await db.collection("users").findOne({ _id: targetUserObjectId });
    const hub = await db.collection("hubs").findOne({ _id: hubObjectId });

    if (!targetUser || !hub) {
      return NextResponse.json({ error: "User or Hub not found." }, { status: 404 });
    }

    // 3. Update membership status to Rejected
    const result = await db.collection("memberships").updateOne(
      {
        hubId: hubObjectId,
        userId: targetUserObjectId,
        status: { $in: ["Pending", "pending", "pending_approval"] },
      },
      {
        $set: {
          status: "Rejected",
          updatedAt: new Date(),
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "No pending request found for this user." }, { status: 404 });
    }

    // 3b. Update corresponding invitation status to rejected
    await db.collection("invitations").updateOne(
      {
        hubId: hubObjectId,
        invitedUserId: targetUserObjectId,
        status: "pending_approval",
      },
      {
        $set: {
          status: "rejected",
          updatedAt: new Date(),
        }
      }
    );

    // 4. Save notification
    await db.collection("notifications").insertOne({
      userId: targetUserObjectId,
      type: "invitation_rejected",
      title: "Invitation Rejected",
      message: `Your request to join ${hub.hubName} was rejected.`,
      read: false,
      metadata: {
        hubId: hubId,
      },
      createdAt: new Date(),
    });

    // 5. Send Rejection Email
    await sendRejectionEmail({
      to: targetUser.email,
      userName: targetUser.name,
      hubName: hub.hubName,
    });

    return NextResponse.json({ success: true, message: "Member request rejected successfully." });

  } catch (err: any) {
    console.error("Error rejecting member:", err);
    return NextResponse.json({ error: err.message || "Failed to reject member request." }, { status: 500 });
  }
}
