import { NextRequest, NextResponse } from "next/server";

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || "http://localhost:8081";
const REALM = process.env.KEYCLOAK_REALM || "food";
const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || "food-api";
const CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400 }
      );
    }
    if (!CLIENT_SECRET) {
      return NextResponse.json(
        { error: "KEYCLOAK_CLIENT_SECRET not configured" },
        { status: 500 }
      );
    }

    const url = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`;
    const body = new URLSearchParams({
      grant_type: "password",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      username,
      password,
    });

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return NextResponse.json(
        { error: data.error_description || data.error || "Login failed" },
        { status: r.status }
      );
    }

    return NextResponse.json({
      access_token: data.access_token,
      expires_in: data.expires_in,
      refresh_token: data.refresh_token,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Login request failed" },
      { status: 500 }
    );
  }
}
