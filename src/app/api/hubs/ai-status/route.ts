import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { ObjectId } from "mongodb";
import { decrypt } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  try {
    const activeUser = await getActiveUser(request);
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const hubId = searchParams.get("hubId");
    if (!hubId) {
      return NextResponse.json({ error: "Hub ID is required." }, { status: 400 });
    }

    const db = await getDb();
    const hubObjectId = new ObjectId(hubId);

    // Verify owner
    const membership = await db.collection("memberships").findOne({
      hubId: hubObjectId,
      userId: new ObjectId(activeUser.id),
      role: "owner",
      status: "approved"
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized. Hub Owner role required." }, { status: 403 });
    }

    const hub = await db.collection("hubs").findOne({ _id: hubObjectId });
    if (!hub) {
      return NextResponse.json({ error: "Hub not found." }, { status: 404 });
    }

    // Determine the key to test
    let apiKey = "";
    if (hub.googleApiKey) {
      apiKey = decrypt(hub.googleApiKey);
    }
    
    let isHubKey = !!apiKey;

    if (!apiKey) {
      apiKey = process.env.GOOGLE_API_KEY || "";
    }

    if (!apiKey) {
      return NextResponse.json({ status: "Fallback Analysis Mode" });
    }

    // Test the key
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }]
        })
      });

      if (res.ok) {
        return NextResponse.json({ status: "Connected (Gemini Active)" });
      } else {
        return NextResponse.json({ status: isHubKey ? "Invalid API Key" : "Fallback Analysis Mode" });
      }
    } catch {
      return NextResponse.json({ status: isHubKey ? "Invalid API Key" : "Fallback Analysis Mode" });
    }

  } catch (err: any) {
    console.error("Error checking AI status:", err);
    return NextResponse.json({ error: err.message || "Failed to check AI status." }, { status: 500 });
  }
}
