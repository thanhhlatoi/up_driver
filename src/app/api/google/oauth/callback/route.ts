import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

import { createDriveAccount } from "@/lib/drive-account-service";
import { getGoogleAccountEmail } from "@/lib/google-drive";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  const code = request.nextUrl.searchParams.get("code");

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: "Google OAuth environment variables are not configured" },
      { status: 500 },
    );
  }

  if (!code) {
    return NextResponse.json({ error: "Missing OAuth code" }, { status: 400 });
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const tokenResponse = await auth.getToken(code);
  const refreshToken = tokenResponse.tokens.refresh_token;

  if (!refreshToken) {
    return NextResponse.json(
      {
        error:
          "Google did not return a refresh token. Reconnect with prompt=consent or revoke the app from the Google account and try again.",
      },
      { status: 400 },
    );
  }

  const googleEmail = await getGoogleAccountEmail(refreshToken);
  await createDriveAccount({
    name: googleEmail ?? "Google Drive Account",
    googleEmail,
    refreshToken,
  });

  return NextResponse.redirect(new URL("/admin/drive-accounts", request.url));
}
