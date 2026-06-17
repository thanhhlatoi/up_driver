export type UploadMode = "SEQUENTIAL" | "PARALLEL";

export type FileCategory = "IMAGE" | "VIDEO" | "UNSUPPORTED";

export type FileStatus =
  | "PENDING"
  | "UPLOADING"
  | "COMPLETED"
  | "FAILED"
  | "UNSUPPORTED";

export type GroupStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "COMPLETED_WITH_ERRORS"
  | "FAILED"
  | "SKIPPED";

export interface UploadFileInput {
  fileName: string;
  mimeType?: string;
  filePath: string;
  category: FileCategory;
}

export interface UploadFileResult {
  fileName: string;
  category: FileCategory;
  status: FileStatus;
  driveFileId?: string;
  error?: string;
}

export interface UploadGroupResult {
  status: GroupStatus;
  files: UploadFileResult[];
}

export interface UploadResult {
  status: "COMPLETED" | "COMPLETED_WITH_ERRORS" | "FAILED";
  sessionId?: string;
  driveAccountId: string;
  driveAccountName: string;
  driveFolderId: string;
  driveFolderName: string;
  userName: string;
  mode: UploadMode;
  images: UploadGroupResult;
  videos: UploadGroupResult;
  unsupported: UploadFileResult[];
}

export interface DriveFolders {
  parentFolderId: string;
  imagesFolderId: string;
  videosFolderId: string;
}

export interface PublicDriveAccount {
  id: string;
  name: string;
  googleEmail: string | null;
  createdAt: string;
}

export interface PublicDriveFolder {
  id: string;
  driveAccountId: string;
  name: string;
  parentFolderId: string;
  imagesFolderId: string;
  videosFolderId: string;
  createdAt: string;
}
