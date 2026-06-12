import { NextRequest, NextResponse } from "next/server";
import { switchSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    await switchSession(email.trim().toLowerCase());
    return NextResponse.json({ success: true, message: `Switched to ${email}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to switch account" }, { status: 400 });
  }
}
