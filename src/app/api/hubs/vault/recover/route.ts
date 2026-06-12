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

    const { hubId, recoveryCode } = await request.json();

    if (!hubId || !recoveryCode) {
      return NextResponse.json({ error: "Hub ID and recovery code are required." }, { status: 400 });
    }

    const db = await getDb();
    
    const vault = await db.collection("hubVaults").findOne({ hubId: new ObjectId(hubId) });
    if (!vault) {
      return NextResponse.json({ error: "Vault not found for this hub." }, { status: 404 });
    }

    const cleanRecoveryCode = recoveryCode.trim().toUpperCase();
    const isMatch = await bcrypt.compare(cleanRecoveryCode, vault.recoveryCodeHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid recovery code." }, { status: 401 });
    }

    return NextResponse.json({ success: true, message: "Vault access recovered." });

  } catch (err: any) {
    console.error("Error recovering vault access:", err);
    return NextResponse.json({ error: err.message || "Failed to recover vault access." }, { status: 500 });
  }
}
