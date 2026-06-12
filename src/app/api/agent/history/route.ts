import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    const activeUser = await getActiveUser();
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const hubId = searchParams.get("hubId");
    if (!hubId) {
      return NextResponse.json({ error: "Hub ID is required." }, { status: 400 });
    }

    const db = await getDb();
    const userObjectId = new ObjectId(activeUser.id);
    const hubObjectId = new ObjectId(hubId);

    // 1. Verify user membership
    const membership = await db.collection("memberships").findOne({
      hubId: hubObjectId,
      userId: userObjectId,
      status: { $in: ["Approved", "approved"] },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied. You are not a member of this Hub." }, { status: 403 });
    }

    // 2. Fetch history
    const chatDoc = await db.collection("agentChats").findOne({
      hubId: hubObjectId,
      userId: userObjectId,
    });

    const messages = chatDoc ? chatDoc.messages || [] : [];

    return NextResponse.json({
      success: true,
      messages: messages,
    });

  } catch (err: any) {
    console.error("Failed to load agent history:", err);
    return NextResponse.json({ error: err.message || "Failed to load agent history." }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
