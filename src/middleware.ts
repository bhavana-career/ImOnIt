import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Protect pages
  const isProtectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/invitation");

  if (isProtectedPath) {
    // 1. Resolve accountId
    let accountId = searchParams.get("account");
    if (!accountId) {
      const activeAccountCookie = request.cookies.get("active_account")?.value;
      if (activeAccountCookie) {
        accountId = activeAccountCookie;
      }
    }

    if (!accountId) {
      console.log(`[Middleware] No active account ID resolved. Redirecting to login.`);
      return NextResponse.redirect(new URL("/", request.url));
    }

    // 2. Read user_accounts cookie and verify the account ID exists in the logged-in list
    const userAccountsCookie = request.cookies.get("user_accounts")?.value;
    if (!userAccountsCookie) {
      console.log(`[Middleware] No user accounts cookie found. Redirecting to login.`);
      return NextResponse.redirect(new URL("/", request.url));
    }

    let accounts: any[] = [];
    try {
      accounts = JSON.parse(userAccountsCookie);
    } catch {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const accountExists = accounts.some((acc) => acc.id === accountId);
    if (!accountExists) {
      console.log(`[Middleware] Account "${accountId}" not found in user_accounts. Redirecting to login.`);
      return NextResponse.redirect(new URL("/", request.url));
    }

    // 3. Verify that a session token exists for this account ID
    const sessionTokensCookie = request.cookies.get("session_tokens")?.value;
    if (!sessionTokensCookie) {
      console.log(`[Middleware] No session tokens cookie found. Redirecting to login.`);
      return NextResponse.redirect(new URL("/", request.url));
    }

    let tokens: Record<string, string> = {};
    try {
      tokens = JSON.parse(sessionTokensCookie);
    } catch {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const token = tokens[accountId];
    if (!token) {
      console.log(`[Middleware] No session token for account "${accountId}". Redirecting to login.`);
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Enforce tab isolation by ensuring the ?account= query parameter is present.
    // If not, redirect to add it.
    if (!searchParams.get("account")) {
      const url = request.nextUrl.clone();
      url.searchParams.set("account", accountId);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/invitation/:path*",
  ],
};
