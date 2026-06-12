import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    let db;
    try {
      db = await getDb();
    } catch (e) {
      return NextResponse.json({ error: "Unable to create account. Please try again." }, { status: 500 });
    }

    // Find the OTP record
    const otpRecord = await db.collection("otps").findOne({ email: cleanEmail });

    if (!otpRecord || otpRecord.code !== cleanCode) {
      return NextResponse.json({ error: "Invalid verification code. Please try again." }, { status: 400 });
    }

    // Check expiration (10 minutes)
    const otpAgeMs = Date.now() - new Date(otpRecord.createdAt).getTime();
    if (otpAgeMs > 10 * 60 * 1000) {
      await db.collection("otps").deleteOne({ email: cleanEmail });
      return NextResponse.json({ error: "Verification code expired. Request a new code." }, { status: 400 });
    }

    // OTP is valid! Delete it so it cannot be reused
    await db.collection("otps").deleteOne({ email: cleanEmail });

    // Find or create user
    const userCol = db.collection("users");
    let user = await userCol.findOne({ email: cleanEmail });
    const now = new Date();

    if (!user) {
      // Create user record in MongoDB
      try {
        const nameVal = otpRecord.name || cleanEmail.split("@")[0];
        const insertResult = await userCol.insertOne({
          name: nameVal,
          profileName: nameVal,
          email: cleanEmail,
          image: null,
          profileImage: null,
          provider: "email",
          authProvider: "email",
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
        });
        user = {
          _id: insertResult.insertedId,
          name: nameVal,
          email: cleanEmail,
          image: null,
        };
      } catch (insertErr) {
        console.error("MongoDB insert error:", insertErr);
        return NextResponse.json({ error: "Unable to create account. Please try again." }, { status: 500 });
      }
    } else {
      // Authenticate existing user: update last login and provider details
      try {
        await userCol.updateOne(
          { _id: user._id },
          {
            $set: {
              lastLoginAt: now,
              updatedAt: now,
              authProvider: user.authProvider || "email",
              provider: user.provider || "email",
            }
          }
        );
      } catch (updateErr) {
        console.error("MongoDB update error:", updateErr);
        return NextResponse.json({ error: "Unable to create account. Please try again." }, { status: 500 });
      }
    }

    // Generate active session and update cookies
    try {
      await createSession(
        user._id.toString(),
        user.email,
        user.name,
        user.image || null
      );
    } catch (sessionErr) {
      console.error("Session creation error:", sessionErr);
      return NextResponse.json({ error: "Authentication failed. Please try again." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Welcome.",
      user: {
        name: user.name,
        email: user.email,
        image: user.image,
      }
    });

  } catch (err: any) {
    console.error("Error verifying OTP:", err);
    return NextResponse.json({ error: err.message || "Failed to verify OTP." }, { status: 500 });
  }
}
