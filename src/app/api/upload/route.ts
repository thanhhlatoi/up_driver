import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { classifyFile } from "@/lib/file-classifier";
import { processUpload } from "@/lib/upload-service";
import type { UploadFileInput, UploadMode } from "@/lib/types";

export const runtime = "nodejs";

const validModes = new Set<UploadMode>(["SEQUENTIAL", "PARALLEL"]);

function badRequest(error: string) {
  return NextResponse.json({ status: "FAILED", error }, { status: 400 });
}

function serverError(error: string) {
  return NextResponse.json({ status: "FAILED", error }, { status: 500 });
}

async function cleanupFiles(files: UploadFileInput[]) {
  await Promise.allSettled(files.map((file) => fs.unlink(file.filePath)));
}

export async function POST(request: NextRequest) {
  let uploadFiles: UploadFileInput[] = [];

  try {
    const formData = await request.formData();
    const driveAccountId = formData.get("driveAccountId");
    const driveFolderId = formData.get("driveFolderId");
    const mode = formData.get("mode");
    const files = formData.getAll("files");

    if (typeof driveAccountId !== "string" || !driveAccountId) {
      return badRequest("Missing driveAccountId");
    }

    if (typeof driveFolderId !== "string" || !driveFolderId) {
      return badRequest("Missing driveFolderId");
    }

    if (typeof mode !== "string" || !mode) {
      return badRequest("Missing upload mode");
    }

    if (!validModes.has(mode as UploadMode)) {
      return badRequest("Invalid upload mode");
    }

    const browserFiles = files.filter((file): file is File => file instanceof File);

    if (browserFiles.length === 0) {
      return badRequest("At least one file is required");
    }

    uploadFiles = await Promise.all(
      browserFiles.map(async (file) => {
        const filePath = path.join(os.tmpdir(), `drive-upload-${crypto.randomUUID()}`);
        const tempFile = await fs.open(filePath, "w");

        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          await tempFile.writeFile(buffer);
        } finally {
          await tempFile.close();
        }

        return {
          fileName: file.name,
          mimeType: file.type || undefined,
          filePath,
          category: classifyFile(file.name, file.type || undefined),
        };
      }),
    );

    const result = await processUpload({
      driveAccountId,
      driveFolderId,
      mode: mode as UploadMode,
      files: uploadFiles,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    const safeCredentialError = message.includes("configured")
      ? message
      : "Upload failed";

    return serverError(safeCredentialError);
  } finally {
    await cleanupFiles(uploadFiles);
  }
}
