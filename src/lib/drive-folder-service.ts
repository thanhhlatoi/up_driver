import { prisma } from "./db";
import { getDriveAccountWithToken } from "./drive-account-service";
import { createDriveClient, createMappedFolder, deleteDriveFileOrFolder } from "./google-drive";

export function toPublicDriveFolder(folder: {
  id: string;
  driveAccountId: string;
  name: string;
  parentFolderId: string;
  imagesFolderId: string;
  videosFolderId: string;
  createdAt: Date;
}) {
  return {
    id: folder.id,
    driveAccountId: folder.driveAccountId,
    name: folder.name,
    parentFolderId: folder.parentFolderId,
    imagesFolderId: folder.imagesFolderId,
    videosFolderId: folder.videosFolderId,
    createdAt: folder.createdAt.toISOString(),
  };
}

export async function createDriveFolder(params: {
  driveAccountId: string;
  name: string;
}) {
  const name = params.name.trim();
  if (!name) {
    throw new Error("Folder name is required");
  }

  const account = await getDriveAccountWithToken(params.driveAccountId);
  const drive = createDriveClient(account.refreshToken);
  const mappedFolder = await createMappedFolder(drive, name, null);

  const folder = await prisma.driveFolder.create({
    data: {
      driveAccountId: params.driveAccountId,
      name,
      parentFolderId: mappedFolder.parentFolderId,
      imagesFolderId: mappedFolder.imagesFolderId,
      videosFolderId: mappedFolder.videosFolderId,
    },
  });

  return toPublicDriveFolder(folder);
}

export async function deleteDriveFolderWithHistory(
  folderId: string,
  confirmFolderName: string,
) {
  const folder = await prisma.driveFolder.findUnique({
    where: { id: folderId },
    include: { driveAccount: true },
  });

  if (!folder) {
    throw new Error("Drive folder not found");
  }

  if (confirmFolderName !== folder.name) {
    throw new Error("Invalid folder delete confirmation");
  }

  const refreshToken = (await getDriveAccountWithToken(folder.driveAccountId)).refreshToken;
  const drive = createDriveClient(refreshToken);
  await deleteDriveFileOrFolder(drive, folder.parentFolderId);
  await prisma.driveFolder.delete({ where: { id: folderId } });
}
