import { NextRequest, NextResponse } from "next/server";
import { getActiveAccountId, removeAccountFromSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const activeAccountId = await getActiveAccountId(request);
    if (activeAccountId) {
      await removeAccountFromSession(activeAccountId);
    }
    
    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (err: any) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: err.message || "Failed to logout" }, { status: 500 });
  }
}
