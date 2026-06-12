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

    const { hubId } = await request.json();
    if (!hubId) {
      return NextResponse.json({ error: "Hub ID is required." }, { status: 400 });
    }

    const db = await getDb();
    const userObjectId = new ObjectId(activeUser.id);
    const hubObjectId = new ObjectId(hubId);

    // 1. Fetch user membership
    const membership = await db.collection("memberships").findOne({
      hubId: hubObjectId,
      userId: userObjectId,
    });

    if (!membership) {
      return NextResponse.json({ error: "Membership not found." }, { status: 404 });
    }

    // Owner protection - owner cannot leave
    if (membership.role === "owner") {
      return NextResponse.json({ error: "Hub Owners cannot leave their own Hub." }, { status: 400 });
    }

    // 2. Set membership status to Removed
    await db.collection("memberships").updateOne(
      { _id: membership._id },
      { $set: { status: "Removed", updatedAt: new Date() } }
    );

    // 3. Update hubs collection arrays
    await db.collection("hubs").updateOne(
      { _id: hubObjectId },
      {
        $pull: {
          memberIds: userObjectId
        }
      } as any
    );

    return NextResponse.json({ success: true, message: "You have left the Hub successfully." });

  } catch (err: any) {
    console.error("Error leaving hub:", err);
    return NextResponse.json({ error: err.message || "Failed to leave Hub." }, { status: 500 });
  }
}
