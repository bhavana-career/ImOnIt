import { NextRequest, NextResponse } from "next/server";
import { getAppUrl } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${getAppUrl(request)}/api/auth/callback/google`;
  
  if (!clientId) {
    return NextResponse.json({ error: "Google client ID is not configured." }, { status: 500 });
  }

  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const options = {
    redirect_uri: redirectUri,
    client_id: clientId,
    access_type: "offline",
    response_type: "code",
    prompt: "select_account", // Enforce Google account chooser
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
  };

  const qs = new URLSearchParams(options).toString();
  return NextResponse.redirect(`${rootUrl}?${qs}`);
}
