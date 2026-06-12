import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const user = await getActiveUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { hubId, password } = await request.json();

    if (!hubId || !password) {
      return NextResponse.json({ error: "Hub ID and password are required." }, { status: 400 });
    }

    const db = await getDb();
    
    const vault = await db.collection("hubVaults").findOne({ hubId: new ObjectId(hubId) });
    if (!vault) {
      return NextResponse.json({ error: "Vault not found for this hub." }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(password, vault.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid Vault Password." }, { status: 401 });
    }

    return NextResponse.json({ success: true, message: "Vault unlocked." });

  } catch (err: any) {
    console.error("Error unlocking vault:", err);
    return NextResponse.json({ error: err.message || "Failed to unlock vault." }, { status: 500 });
  }
}
