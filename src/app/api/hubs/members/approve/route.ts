import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { sendApprovalEmail } from "@/lib/email";
import { ObjectId } from "mongodb";
import { getAppUrl } from "@/lib/utils";

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

    // 3. Update membership status to Approved
    const result = await db.collection("memberships").updateOne(
      {
        hubId: hubObjectId,
        userId: targetUserObjectId,
        status: { $in: ["Pending", "pending", "pending_approval"] },
      },
      {
        $set: {
          status: "Approved",
          updatedAt: new Date(),
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "No pending request found for this user." }, { status: 404 });
    }

    // 4. Update hubs collection helper arrays
    await db.collection("hubs").updateOne(
      { _id: hubObjectId },
      {
        $addToSet: {
          memberIds: targetUserObjectId
        }
      }
    );

    // 4b. Update corresponding invitation status to approved
    await db.collection("invitations").updateOne(
      {
        hubId: hubObjectId,
        invitedUserId: targetUserObjectId,
        status: "pending_approval",
      },
      {
        $set: {
          status: "approved",
          updatedAt: new Date(),
        }
      }
    );

    // 5. Save notification
    await db.collection("notifications").insertOne({
      userId: targetUserObjectId,
      type: "invitation_approved",
      title: "Invitation Approved",
      message: `Your request to join ${hub.hubName} has been approved.`,
      read: false,
      metadata: {
        hubId: hubId,
      },
      createdAt: new Date(),
    });

    // 6. Send Approval Email
    const appUrl = getAppUrl(request);
    const hubLink = `${appUrl}/dashboard`;

    await sendApprovalEmail({
      to: targetUser.email,
      userName: targetUser.name,
      hubName: hub.hubName,
      hubLink,
    });

    return NextResponse.json({ success: true, message: "Member approved successfully!" });

  } catch (err: any) {
    console.error("Error approving member:", err);
    return NextResponse.json({ error: err.message || "Failed to approve member." }, { status: 500 });
  }
}
