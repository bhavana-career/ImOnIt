import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const activeUser = await getActiveUser(request);
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

    // 2. Find and update invitation to 'revoked'
    const result = await db.collection("invitations").updateOne(
      {
        hubId: hubObjectId,
        email: cleanEmail,
        status: "sent",
      },
      {
        $set: {
          status: "revoked",
          updatedAt: new Date(),
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "No pending invitation found for this user." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Invitation revoked successfully!" });

  } catch (err: any) {
    console.error("Error revoking invitation:", err);
    return NextResponse.json({ error: err.message || "Failed to revoke invitation." }, { status: 500 });
  }
}
