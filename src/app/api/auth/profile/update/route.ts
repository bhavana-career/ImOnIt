import { NextRequest, NextResponse } from "next/server";
import { getActiveUser, updateSessionUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const user = await getActiveUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { name, image } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const cleanName = name.trim();
    let cleanImage = image ? image.trim() : null;

    if (cleanImage) {
      try {
        const parsedUrl = new URL(cleanImage);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          return NextResponse.json({ error: "Profile image URL must be a valid http or https link." }, { status: 400 });
        }
      } catch (err) {
        return NextResponse.json({ error: "Invalid profile image URL format." }, { status: 400 });
      }
    }

    const db = await getDb();
    
    // Update user in MongoDB
    await db.collection("users").updateOne(
      { _id: new ObjectId(user.id) },
      {
        $set: {
          name: cleanName,
          image: cleanImage,
          updatedAt: new Date()
        }
      }
    );

    // Update active session in cookies
    await updateSessionUser(user.email, cleanName, cleanImage);

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        name: cleanName,
        image: cleanImage
      }
    });

  } catch (err: any) {
    console.error("Error updating profile:", err);
    return NextResponse.json({ error: err.message || "Failed to update profile." }, { status: 500 });
  }
}
