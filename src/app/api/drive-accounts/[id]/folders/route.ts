import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { createDriveFolder, toPublicDriveFolder } from "@/lib/drive-folder-service";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const folders = await prisma.driveFolder.findMany({
    where: { driveAccountId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ folders: folders.map(toPublicDriveFolder) });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as { name?: string };

  try {
    const folder = await createDriveFolder({ driveAccountId: id, name: body.name ?? "" });
    return NextResponse.json({ folder });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create folder failed" },
      { status: 400 },
    );
  }
}
