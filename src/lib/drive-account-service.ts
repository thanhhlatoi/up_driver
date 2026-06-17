import { prisma } from "./db";
import { decryptText, encryptText } from "./crypto";
import { createDriveClient, deleteDriveFileOrFolder } from "./google-drive";

export function toPublicDriveAccount(account: {
  id: string;
  name: string;
  googleEmail: string | null;
  createdAt: Date;
}) {
  return {
    id: account.id,
    name: account.name,
    googleEmail: account.googleEmail,
    createdAt: account.createdAt.toISOString(),
  };
}

export async function getDriveAccountWithToken(id: string) {
  const account = await prisma.driveAccount.findUnique({ where: { id } });

  if (!account) {
    throw new Error("Drive account not found");
  }

  return {
    ...account,
    refreshToken: decryptText(account.refreshTokenEncrypted),
  };
}

export async function createDriveAccount(params: {
  name: string;
  googleEmail: string | null;
  refreshToken: string;
}) {
  const account = await prisma.driveAccount.create({
    data: {
      name: params.name,
      googleEmail: params.googleEmail,
      refreshTokenEncrypted: encryptText(params.refreshToken),
    },
  });

  return toPublicDriveAccount(account);
}

export async function deleteDriveAccountWithRemoteFolders(
  driveAccountId: string,
  confirmText: string,
) {
  if (confirmText !== "DELETE DRIVE ACCOUNT") {
    throw new Error("Invalid delete confirmation");
  }

  const account = await getDriveAccountWithToken(driveAccountId);
  const folders = await prisma.driveFolder.findMany({ where: { driveAccountId } });
  const drive = createDriveClient(account.refreshToken);

  const deletionErrors: string[] = [];
  for (const folder of folders) {
    try {
      await deleteDriveFileOrFolder(drive, folder.parentFolderId);
    } catch (error) {
      deletionErrors.push(
        error instanceof Error ? error.message : `Failed to delete ${folder.name}`,
      );
    }
  }

  if (deletionErrors.length > 0) {
    throw new Error(deletionErrors.join("; "));
  }

  await prisma.driveAccount.delete({ where: { id: driveAccountId } });
}
