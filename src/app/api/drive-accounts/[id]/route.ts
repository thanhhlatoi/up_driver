import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import {
  deleteDriveAccountWithRemoteFolders,
  toPublicDriveAccount,
} from "@/lib/drive-account-service";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const account = await prisma.driveAccount.update({ where: { id }, data: { name } });

  return NextResponse.json({ account: toPublicDriveAccount(account) });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as { confirmText?: string };

  try {
    await deleteDriveAccountWithRemoteFolders(id, body.confirmText ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 400 },
    );
  }
}
