import { NextRequest, NextResponse } from "next/server";
import { getActiveUser, getUserAccounts } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = await getActiveUser(request);
    const accounts = await getUserAccounts();
    
    return NextResponse.json({
      authenticated: !!user,
      user,
      accounts,
    });
  } catch (err: any) {
    console.error("Session fetch error:", err);
    if (err.message && err.message.includes("Session expired")) {
      return NextResponse.json({
        authenticated: false,
        error: "Session expired. Please sign in again.",
        expired: true
      }, { status: 401 });
    }
    return NextResponse.json({ authenticated: false, error: "Unauthorized" }, { status: 401 });
  }
}
