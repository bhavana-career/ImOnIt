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

    const { hubId, otp } = await request.json();
    if (!hubId || !otp) {
      return NextResponse.json({ error: "Hub ID and verification code are required." }, { status: 400 });
    }

    const db = await getDb();
    const ownerObjectId = new ObjectId(activeUser.id);
    const hubObjectId = new ObjectId(hubId);
    const cleanEmail = activeUser.email.toLowerCase();

    // 1. Verify that requester is Owner of this Hub
    const membership = await db.collection("memberships").findOne({
      hubId: hubObjectId,
      userId: ownerObjectId,
      role: "owner",
      status: "approved",
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized. Owner permissions required." }, { status: 403 });
    }

    // 2. Lookup OTP
    const otpRecord = await db.collection("otps").findOne({
      email: cleanEmail,
      hubId: hubObjectId,
      action: "delete_hub",
    });

    if (!otpRecord || otpRecord.code !== otp.trim()) {
      return NextResponse.json({ error: "Invalid verification code. Please try again." }, { status: 400 });
    }

    // Check expiration (10 minutes)
    const ageMs = Date.now() - new Date(otpRecord.createdAt).getTime();
    if (ageMs > 10 * 60 * 1000) {
      await db.collection("otps").deleteOne({ _id: otpRecord._id });
      return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
    }

    // 3. OTP is valid! Perform cascading deletes
    // Delete OTP
    await db.collection("otps").deleteOne({ _id: otpRecord._id });
    
    // Delete Hub Vaults
    await db.collection("hubVaults").deleteMany({ hubId: hubObjectId });
    
    // Delete Memberships
    await db.collection("memberships").deleteMany({ hubId: hubObjectId });
    
    // Delete Invitations
    await db.collection("invitations").deleteMany({ hubId: hubObjectId });
    
    // Delete Hub
    await db.collection("hubs").deleteOne({ _id: hubObjectId });

    return NextResponse.json({ success: true, message: "Hub and all associated data deleted successfully." });

  } catch (err: any) {
    console.error("Error confirming hub deletion:", err);
    return NextResponse.json({ error: err.message || "Failed to confirm deletion." }, { status: 500 });
  }
}
