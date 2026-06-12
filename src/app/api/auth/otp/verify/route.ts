import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const { email, code, mode } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const db = await getDb();

    // Find the OTP record
    const otpRecord = await db.collection("otps").findOne({ email: cleanEmail });

    if (!otpRecord || otpRecord.code !== cleanCode) {
      return NextResponse.json({ error: "Invalid verification code. Please try again." }, { status: 400 });
    }

    // Check expiration (10 minutes)
    const otpAgeMs = Date.now() - new Date(otpRecord.createdAt).getTime();
    if (otpAgeMs > 10 * 60 * 1000) {
      await db.collection("otps").deleteOne({ email: cleanEmail });
      return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
    }

    // OTP is valid! Delete it so it cannot be reused
    await db.collection("otps").deleteOne({ email: cleanEmail });

    // Find or create user
    const userCol = db.collection("users");
    let user = await userCol.findOne({ email: cleanEmail });
    const now = new Date();

    if (mode === "register") {
      if (user) {
        return NextResponse.json({ error: "This account already exists. Please log in instead." }, { status: 400 });
      }
      
      const insertResult = await userCol.insertOne({
        name: otpRecord.name || cleanEmail.split("@")[0],
        email: cleanEmail,
        image: null,
        authProvider: "email",
        provider: "email",
        createdAt: now,
        lastLoginAt: now,
      });
      user = {
        _id: insertResult.insertedId,
        name: otpRecord.name || cleanEmail.split("@")[0],
        email: cleanEmail,
        image: null,
        authProvider: "email",
      };
    } else {
      // login mode
      if (!user) {
        return NextResponse.json({ error: "This account does not exist. Please register first." }, { status: 404 });
      }
      
      await userCol.updateOne(
        { _id: user._id },
        {
          $set: {
            lastLoginAt: now,
            authProvider: user.authProvider || "email",
            provider: user.provider || "email",
          }
        }
      );
    }

    // Generate active session and update cookies
    await createSession(
      user._id!.toString(),
      user.email,
      user.name,
      user.image || null
    );

    return NextResponse.json({
      success: true,
      message: mode === "register" ? "Account created successfully." : "Welcome back.",
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
