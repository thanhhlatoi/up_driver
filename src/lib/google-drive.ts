import fs from "node:fs";

import { google } from "googleapis";

import type { drive_v3 } from "googleapis";

const folderMimeType = "application/vnd.google-apps.folder";

export function createDriveClient(refreshToken: string) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are not configured");
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  return google.drive({ version: "v3", auth });
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function findOrCreateFolder(
  drive: drive_v3.Drive,
  name: string,
  parentFolderId: string,
): Promise<string> {
  const safeName = escapeDriveQueryValue(name);
  const safeParent = escapeDriveQueryValue(parentFolderId);
  const response = await drive.files.list({
    fields: "files(id, name)",
    pageSize: 1,
    q: [
      `name = '${safeName}'`,
      `mimeType = '${folderMimeType}'`,
      `'${safeParent}' in parents`,
      "trashed = false",
    ].join(" and "),
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const existingFolderId = response.data.files?.[0]?.id;
  if (existingFolderId) {
    return existingFolderId;
  }

  const createResponse = await drive.files.create({
    fields: "id",
    requestBody: {
      name,
      mimeType: folderMimeType,
      parents: [parentFolderId],
    },
    supportsAllDrives: true,
  });

  if (!createResponse.data.id) {
    throw new Error(`Google Drive did not return an id for folder ${name}`);
  }

  return createResponse.data.id;
}

export async function createMappedFolder(
  drive: drive_v3.Drive,
  name: string,
  rootFolderId?: string | null,
) {
  const parentFolderId = rootFolderId
    ? await findOrCreateFolder(drive, name, rootFolderId)
    : await createFolder(drive, name);
  const imagesFolderId = await findOrCreateFolder(drive, "Images", parentFolderId);
  const videosFolderId = await findOrCreateFolder(drive, "Videos", parentFolderId);

  return { parentFolderId, imagesFolderId, videosFolderId };
}

export async function uploadFileToDrive(params: {
  drive: drive_v3.Drive;
  fileName: string;
  filePath: string;
  mimeType?: string;
  parentFolderId: string;
}): Promise<string> {
  const response = await params.drive.files.create({
    fields: "id",
    media: {
      mimeType: params.mimeType || "application/octet-stream",
      body: fs.createReadStream(params.filePath),
    },
    requestBody: {
      name: params.fileName,
      parents: [params.parentFolderId],
    },
    supportsAllDrives: true,
  });

  if (!response.data.id) {
    throw new Error(`Google Drive did not return an id for file ${params.fileName}`);
  }

  return response.data.id;
}

export async function createFolder(
  drive: drive_v3.Drive,
  name: string,
  parentFolderId?: string | null,
) {
  const createResponse = await drive.files.create({
    fields: "id",
    requestBody: {
      name,
      mimeType: folderMimeType,
      parents: parentFolderId ? [parentFolderId] : undefined,
    },
    supportsAllDrives: true,
  });

  if (!createResponse.data.id) {
    throw new Error(`Google Drive did not return an id for folder ${name}`);
  }

  return createResponse.data.id;
}

export async function deleteDriveFileOrFolder(drive: drive_v3.Drive, fileId: string) {
  await drive.files.delete({ fileId, supportsAllDrives: true });
}

export async function getGoogleAccountEmail(refreshToken: string) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are not configured");
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  const oauth2 = google.oauth2({ version: "v2", auth });
  const response = await oauth2.userinfo.get();

  return response.data.email ?? null;
}
