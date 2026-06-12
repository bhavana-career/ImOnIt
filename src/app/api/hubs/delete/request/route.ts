import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { sendHubDeleteOtpEmail } from "@/lib/email";
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
    const ownerObjectId = new ObjectId(activeUser.id);
    const hubObjectId = new ObjectId(hubId);

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

    // Fetch Hub details
    const hub = await db.collection("hubs").findOne({ _id: hubObjectId });
    if (!hub) {
      return NextResponse.json({ error: "Hub not found." }, { status: 404 });
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Save OTP in otps collection (marked as delete request)
    await db.collection("otps").updateOne(
      { email: activeUser.email.toLowerCase(), hubId: hubObjectId },
      {
        $set: {
          email: activeUser.email.toLowerCase(),
          hubId: hubObjectId,
          code: otp,
          action: "delete_hub",
          createdAt: new Date(),
        }
      },
      { upsert: true }
    );

    // 4. Send branded OTP email
    await sendHubDeleteOtpEmail({
      to: activeUser.email,
      ownerName: activeUser.name,
      hubName: hub.hubName,
      otp,
    });

    return NextResponse.json({ success: true, message: "Verification code sent to your email." });

  } catch (err: any) {
    console.error("Error requesting hub deletion:", err);
    return NextResponse.json({ error: err.message || "Failed to initiate deletion." }, { status: 500 });
  }
}
