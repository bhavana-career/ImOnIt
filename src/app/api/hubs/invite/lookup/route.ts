import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const activeUser = await getActiveUser();
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const db = await getDb();
    const cleanEmail = email.trim().toLowerCase();

    // Query user
    const user = await db.collection("users").findOne({ email: cleanEmail });

    if (!user) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      user: {
        name: user.name,
        email: user.email,
        image: user.image || null,
      },
    });

  } catch (err: any) {
    console.error("Error looking up user by email:", err);
    return NextResponse.json({ error: err.message || "Search failed." }, { status: 500 });
  }
}
