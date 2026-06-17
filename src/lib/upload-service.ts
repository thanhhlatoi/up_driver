import type {
  FileCategory,
  UploadFileInput,
  UploadFileResult,
  UploadGroupResult,
  UploadMode,
  UploadResult,
} from "./types";
import { prisma } from "./db";
import { getDriveAccountWithToken } from "./drive-account-service";
import { createDriveClient, uploadFileToDrive } from "./google-drive";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown upload error";
}

async function uploadGroupSequentially(
  params: {
    sessionId: string;
    drive: ReturnType<typeof createDriveClient>;
  },
  files: UploadFileInput[],
  category: Exclude<FileCategory, "UNSUPPORTED">,
  parentFolderId: string,
): Promise<UploadGroupResult> {
  if (files.length === 0) {
    return { status: "SKIPPED", files: [] };
  }

  const results: UploadFileResult[] = [];

  for (const file of files) {
    try {
      await prisma.uploadFile.updateMany({
        where: { uploadSessionId: params.sessionId, fileName: file.fileName },
        data: { status: "UPLOADING" },
      });

      const driveFileId = await uploadFileToDrive({
        drive: params.drive,
        fileName: file.fileName,
        filePath: file.filePath,
        mimeType: file.mimeType,
        parentFolderId,
      });

      await prisma.uploadFile.updateMany({
        where: { uploadSessionId: params.sessionId, fileName: file.fileName },
        data: { status: "COMPLETED", driveFileId, completedAt: new Date() },
      });

      results.push({
        fileName: file.fileName,
        category,
        status: "COMPLETED",
        driveFileId,
      });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      await prisma.uploadFile.updateMany({
        where: { uploadSessionId: params.sessionId, fileName: file.fileName },
        data: { status: "FAILED", errorMessage, completedAt: new Date() },
      });

      results.push({
        fileName: file.fileName,
        category,
        status: "FAILED",
        error: errorMessage,
      });
    }
  }

  const hasErrors = results.some((result) => result.status === "FAILED");

  return {
    status: hasErrors ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
    files: results,
  };
}

function getOverallStatus(images: UploadGroupResult, videos: UploadGroupResult) {
  const failedGroups = [images, videos].filter((group) => group.status === "FAILED");
  if (failedGroups.length > 0) {
    return "FAILED";
  }

  const hasFileErrors = [images, videos].some(
    (group) => group.status === "COMPLETED_WITH_ERRORS",
  );

  return hasFileErrors ? "COMPLETED_WITH_ERRORS" : "COMPLETED";
}

export async function processUpload(params: {
  driveAccountId: string;
  driveFolderId: string;
  mode: UploadMode;
  files: UploadFileInput[];
}): Promise<UploadResult> {
  const account = await getDriveAccountWithToken(params.driveAccountId);
  const folder = await prisma.driveFolder.findFirst({
    where: { id: params.driveFolderId, driveAccountId: params.driveAccountId },
  });

  if (!folder) {
    throw new Error("Drive folder not found");
  }

  const drive = createDriveClient(account.refreshToken);
  const imageFiles = params.files.filter((file) => file.category === "IMAGE");
  const videoFiles = params.files.filter((file) => file.category === "VIDEO");
  const unsupported = params.files
    .filter((file) => file.category === "UNSUPPORTED")
    .map<UploadFileResult>((file) => ({
      fileName: file.fileName,
      category: "UNSUPPORTED",
      status: "UNSUPPORTED",
    }));

  const session = await prisma.uploadSession.create({
    data: {
      driveAccountId: params.driveAccountId,
      driveFolderId: params.driveFolderId,
      mode: params.mode,
      status: "RUNNING",
      files: {
        create: params.files.map((file) => ({
          fileName: file.fileName,
          mimeType: file.mimeType,
          category: file.category,
          status: file.category === "UNSUPPORTED" ? "UNSUPPORTED" : "PENDING",
          completedAt: file.category === "UNSUPPORTED" ? new Date() : undefined,
        })),
      },
    },
  });

  let images: UploadGroupResult;
  let videos: UploadGroupResult;

  if (params.mode === "PARALLEL") {
    [images, videos] = await Promise.all([
      uploadGroupSequentially(
        { sessionId: session.id, drive },
        imageFiles,
        "IMAGE",
        folder.imagesFolderId,
      ),
      uploadGroupSequentially(
        { sessionId: session.id, drive },
        videoFiles,
        "VIDEO",
        folder.videosFolderId,
      ),
    ]);
  } else {
    images = await uploadGroupSequentially(
      { sessionId: session.id, drive },
      imageFiles,
      "IMAGE",
      folder.imagesFolderId,
    );
    videos = await uploadGroupSequentially(
      { sessionId: session.id, drive },
      videoFiles,
      "VIDEO",
      folder.videosFolderId,
    );
  }

  const status = getOverallStatus(images, videos);
  await prisma.uploadSession.update({
    where: { id: session.id },
    data: { status, completedAt: new Date() },
  });

  return {
    status,
    sessionId: session.id,
    driveAccountId: account.id,
    driveAccountName: account.name,
    driveFolderId: folder.id,
    driveFolderName: folder.name,
    userName: folder.name,
    mode: params.mode,
    images,
    videos,
    unsupported,
  };
}
