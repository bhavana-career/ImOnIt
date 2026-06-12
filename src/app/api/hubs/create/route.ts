import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

function generateRecoveryCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part()}-${part()}-${part()}-${part()}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getActiveUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in again." }, { status: 401 });
    }

    const { name, description, vaultPassword, hubImage } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Hub name is required." }, { status: 400 });
    }

    if (!vaultPassword || vaultPassword.trim().length === 0) {
      return NextResponse.json({ error: "Vault password is required." }, { status: 400 });
    }

    const db = await getDb();

    const ownerObjectId = new ObjectId(user.id);
    const newHub = {
      hubName: name.trim(),
      hubDescription: description ? description.trim() : "",
      hubImage: hubImage || null,
      ownerId: ownerObjectId,
      memberIds: [ownerObjectId],
      createdAt: new Date(),
    };

    const hubResult = await db.collection("hubs").insertOne(newHub);
    const hubId = hubResult.insertedId;

    // Create approved owner membership record
    await db.collection("memberships").insertOne({
      hubId: hubId,
      userId: ownerObjectId,
      email: user.email.toLowerCase(),
      role: "owner",
      status: "approved",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const rawRecoveryCode = generateRecoveryCode();

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(vaultPassword, saltRounds);
    const recoveryCodeHash = await bcrypt.hash(rawRecoveryCode, saltRounds);

    const newVault = {
      hubId: hubId,
      passwordHash,
      recoveryCodeHash,
      createdAt: new Date(),
    };

    await db.collection("hubVaults").insertOne(newVault);

    return NextResponse.json({
      success: true,
      hubId: hubId.toString(),
      hubName: newHub.hubName,
      recoveryCode: rawRecoveryCode,
    });

  } catch (err: any) {
    console.error("Error creating hub:", err);
    return NextResponse.json({ error: err.message || "Failed to create hub." }, { status: 500 });
  }
}
