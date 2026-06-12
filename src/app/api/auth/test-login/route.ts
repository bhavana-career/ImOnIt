import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createSession } from "@/lib/session";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  const account = request.nextUrl.searchParams.get("account");
  if (!account) return NextResponse.json({ error: "Missing account param" });

  const email = `${account}@test.com`;
  const db = await getDb();
  
  let user = await db.collection("users").findOne({ email });
  if (!user) {
    const insertResult = await db.collection("users").insertOne({
      name: `Test User ${account}`,
      email: email,
      image: null,
      provider: "email",
      createdAt: new Date(),
    });
    user = { _id: insertResult.insertedId, name: `Test User ${account}`, email };
  }

  await createSession(user._id.toString(), user.email, user.name, null);
  
  const response = NextResponse.json({ success: true, userId: user._id.toString() });
  return response;
}
