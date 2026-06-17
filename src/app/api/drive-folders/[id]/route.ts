import { NextRequest, NextResponse } from "next/server";

import { deleteDriveFolderWithHistory } from "@/lib/drive-folder-service";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as { confirmFolderName?: string };

  try {
    await deleteDriveFolderWithHistory(id, body.confirmFolderName ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete folder failed" },
      { status: 400 },
    );
  }
}
