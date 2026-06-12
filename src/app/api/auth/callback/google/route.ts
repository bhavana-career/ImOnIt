import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createSession } from "@/lib/session";
import { getAppUrl } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const appUrl = getAppUrl(request);

  if (error) {
    return NextResponse.redirect(`${appUrl}/auth?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/auth?error=Missing+OAuth+code`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${appUrl}/api/auth/callback/google`;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || tokenData.error || "Failed to exchange token");
    }

    const { access_token } = tokenData;

    // Fetch user profile from Google userinfo endpoint
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profileData = await profileResponse.json();
    if (!profileResponse.ok) {
      throw new Error("Failed to retrieve user profile");
    }

    const { name, email, picture: image } = profileData;

    if (!email) {
      throw new Error("Google account does not have an email address");
    }

    const db = await getDb();
    
    // Check if account already exists with this email (might be registered with email OTP or google)
    const existingUser = await db.collection("users").findOne({ email: email.toLowerCase() });
    
    let userId;
    const now = new Date();

    if (existingUser) {
      userId = existingUser._id;
      // If it exists, update lastLoginAt and auth provider
      await db.collection("users").updateOne(
        { _id: userId },
        {
          $set: {
            lastLoginAt: now,
            authProvider: "google",
            provider: "google",
            name: name || existingUser.name,
            image: image || existingUser.image,
          },
        }
      );
    } else {
      // Create user
      const result = await db.collection("users").insertOne({
        name: name || email.split("@")[0],
        email: email.toLowerCase(),
        image: image || null,
        authProvider: "google",
        provider: "google",
        createdAt: now,
        lastLoginAt: now,
      });
      userId = result.insertedId;
    }

    // Register active session & update cookies
    await createSession(
      userId.toString(),
      email.toLowerCase(),
      name || email.split("@")[0],
      image || null
    );

    // Check for invite token to return to invitation flow
    const inviteToken = request.cookies.get("invite_token")?.value;
    const welcomeMsg = existingUser ? "Welcome back." : "Welcome back.";
    
    if (inviteToken) {
      const response = NextResponse.redirect(`${appUrl}/invitation?token=${inviteToken}`);
      response.cookies.delete("invite_token");
      return response;
    }

    const response = NextResponse.redirect(
      `${appUrl}/dashboard?message=${encodeURIComponent(welcomeMsg)}`
    );
    return response;

  } catch (err: any) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(
      `${appUrl}/auth?error=${encodeURIComponent(err.message || "OAuth authentication failed")}`
    );
  }
}
