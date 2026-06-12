import { NextRequest, NextResponse } from "next/server";
import { getActiveEmail, removeAccountFromSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const activeEmail = await getActiveEmail();
    if (activeEmail) {
      await removeAccountFromSession(activeEmail);
    }
    
    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (err: any) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: err.message || "Failed to logout" }, { status: 500 });
  }
}
