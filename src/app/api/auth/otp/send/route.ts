import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const { email, name, mode } = await request.json(); // mode: 'login' | 'register'

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = await getDb();

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({ email: cleanEmail });

    if (mode === "register") {
      if (!name) {
        return NextResponse.json({ error: "Name is required for registration." }, { status: 400 });
      }
      if (existingUser) {
        // "This account already exists. Please sign in instead."
        return NextResponse.json({
          error: "This account already exists. Please sign in instead.",
          code: "EMAIL_EXISTS"
        }, { status: 409 });
      }
    } else if (mode === "login") {
      if (!existingUser) {
        return NextResponse.json({
          error: "This account does not exist. Please create an account first.",
          code: "EMAIL_NOT_FOUND"
        }, { status: 404 });
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save/Upsert OTP in the otps collection
    await db.collection("otps").updateOne(
      { email: cleanEmail },
      {
        $set: {
          email: cleanEmail,
          name: mode === "register" ? name : (existingUser?.name || ""),
          code: otp,
          createdAt: new Date(),
        }
      },
      { upsert: true }
    );

    // Send the email using SendGrid
    const msg = {
      to: cleanEmail,
      from: process.env.EMAIL_FROM || "imonit.notifications@gmail.com",
      subject: `Your OTP Code for I'm On It Bruh: ${otp}`,
      text: `Your 6-digit verification code is ${otp}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-size: 32px; font-weight: bold; color: #ef4444; vertical-align: middle;">🔥</span>
            <span style="font-size: 24px; font-weight: bold; color: #111827; vertical-align: middle; margin-left: 8px;">I'm On It Bruh</span>
          </div>
          <p style="font-size: 16px; color: #374151;">Hello,</p>
          <p style="font-size: 16px; color: #374151; line-height: 1.5;">Here is your 6-digit verification code to log in or complete your registration:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #dc2626; background-color: #fef2f2; padding: 12px 28px; border-radius: 8px; border: 1px solid #fee2e2; display: inline-block;">
              ${otp}
            </span>
          </div>
          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            This code will expire in 10 minutes.
          </p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.4;">
            <strong>Hint:</strong> Check your <strong>Spam</strong> or <strong>Junk</strong> folder if you don't see the email in your inbox.
          </p>
        </div>
      `,
    };

    await sgMail.send(msg);

    return NextResponse.json({ success: true, message: "OTP sent successfully!" });

  } catch (err: any) {
    console.error("Error sending OTP:", err);
    return NextResponse.json({ error: err.message || "Failed to send OTP email." }, { status: 500 });
  }
}
