import { NextRequest } from "next/server";

/**
 * Resolves the application's base URL dynamically.
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL environment variable (configured by user)
 * 2. Incoming request's origin (if available)
 * 3. VERCEL_URL or NEXT_PUBLIC_VERCEL_URL environment variables
 * 4. Fallback to localhost:3000
 */
export function getAppUrl(request?: NextRequest | Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (request) {
    try {
      const origin = new URL(request.url).origin;
      if (origin && !origin.includes("localhost:3000")) {
        return origin;
      }
    } catch (e) {
      // Ignored
    }
  }

  // Fallback for Vercel deployments
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}
