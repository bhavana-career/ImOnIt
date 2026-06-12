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

    const { hubId, userId } = await request.json();
    if (!hubId || !userId) {
      return NextResponse.json({ error: "Hub ID and User ID are required." }, { status: 400 });
    }

    const db = await getDb();
    const ownerObjectId = new ObjectId(activeUser.id);
    const targetUserObjectId = new ObjectId(userId);
    const hubObjectId = new ObjectId(hubId);

    // 1. Verify that requester is Owner of this Hub
    const ownerMembership = await db.collection("memberships").findOne({
      hubId: hubObjectId,
      userId: ownerObjectId,
      role: "owner",
      status: { $in: ["Approved", "approved"] },
    });

    if (!ownerMembership) {
      return NextResponse.json({ error: "Unauthorized. Owner permissions required." }, { status: 403 });
    }

    // 2. Fetch target user membership to verify owner role
    const targetMembership = await db.collection("memberships").findOne({
      hubId: hubObjectId,
      userId: targetUserObjectId,
    });

    if (!targetMembership) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    // Owner protection - cannot remove owner
    if (targetMembership.role === "owner") {
      return NextResponse.json({ error: "Cannot remove the Hub Owner." }, { status: 400 });
    }

    // 3. Set membership status to Removed
    await db.collection("memberships").updateOne(
      { _id: targetMembership._id },
      { $set: { status: "Removed", updatedAt: new Date() } }
    );

    // 4. Update hubs collection arrays
    await db.collection("hubs").updateOne(
      { _id: hubObjectId },
      {
        $pull: {
          memberIds: targetUserObjectId
        }
      } as any
    );

    // Note: Silent removal - DO NOT write notifications or send emails as per user requirements.
    return NextResponse.json({ success: true, message: "Member removed successfully." });

  } catch (err: any) {
    console.error("Error removing member:", err);
    return NextResponse.json({ error: err.message || "Failed to remove member." }, { status: 500 });
  }
}
