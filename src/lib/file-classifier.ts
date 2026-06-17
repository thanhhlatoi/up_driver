import path from "node:path";

import type { FileCategory } from "./types";

const imageExtensions = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".heic",
  ".heif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".tif",
  ".tiff",
  ".webp",
]);

const videoExtensions = new Set([
  ".3gp",
  ".avi",
  ".m4v",
  ".mkv",
  ".mov",
  ".mp4",
  ".mpeg",
  ".mpg",
  ".webm",
  ".wmv",
]);

export function classifyFile(fileName: string, mimeType?: string): FileCategory {
  if (mimeType?.startsWith("image/")) {
    return "IMAGE";
  }

  if (mimeType?.startsWith("video/")) {
    return "VIDEO";
  }

  const extension = path.extname(fileName).toLowerCase();

  if (imageExtensions.has(extension)) {
    return "IMAGE";
  }

  if (videoExtensions.has(extension)) {
    return "VIDEO";
  }

  return "UNSUPPORTED";
}
