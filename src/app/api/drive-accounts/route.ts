import { NextRequest, NextResponse } from "next/server";

import { getDatabaseConfigError } from "@/lib/config";
import { prisma } from "@/lib/db";
import { toPublicDriveAccount } from "@/lib/drive-account-service";

export const runtime = "nodejs";

export async function GET() {
  const configError = getDatabaseConfigError();
  if (configError) {
    return NextResponse.json({ accounts: [], error: configError }, { status: 503 });
  }

  const accounts = await prisma.driveAccount.findMany({ orderBy: { createdAt: "desc" } });

  return NextResponse.json({ accounts: accounts.map(toPublicDriveAccount) });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { name?: string };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  return NextResponse.json(
    { error: "Use /api/google/oauth/start to connect a Google Drive account" },
    { status: 400 },
  );
}
