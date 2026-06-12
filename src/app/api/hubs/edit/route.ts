import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { ObjectId } from "mongodb";
import { encrypt } from "@/lib/crypto";

export async function POST(request: NextRequest) {
  try {
    const activeUser = await getActiveUser(request);
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { hubId, name, description, hubImage, googleApiKey } = await request.json();

    if (!hubId || !name || !name.trim()) {
      return NextResponse.json({ error: "Hub ID and Hub Name are required." }, { status: 400 });
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

    // 2. Update Hub details
    const updateFields: any = {
      hubName: name.trim(),
      hubDescription: description ? description.trim() : "",
      hubImage: hubImage || null,
    };

    if (googleApiKey !== undefined) {
      const trimmedKey = googleApiKey.trim();
      if (trimmedKey === "") {
        updateFields.googleApiKey = null;
      } else if (!trimmedKey.includes("*")) {
        updateFields.googleApiKey = encrypt(trimmedKey);
      }
    }

    const result = await db.collection("hubs").updateOne(
      { _id: hubObjectId },
      {
        $set: updateFields
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Hub not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Hub updated successfully!" });

  } catch (err: any) {
    console.error("Error editing hub:", err);
    return NextResponse.json({ error: err.message || "Failed to update Hub." }, { status: 500 });
  }
}

