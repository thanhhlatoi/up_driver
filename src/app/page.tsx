"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

type UploadMode = "SEQUENTIAL" | "PARALLEL";
type FileCategory = "IMAGE" | "VIDEO" | "UNSUPPORTED";
type FileStatus = "PENDING" | "UPLOADING" | "COMPLETED" | "FAILED" | "UNSUPPORTED";
type GroupStatus = "PENDING" | "RUNNING" | "COMPLETED" | "COMPLETED_WITH_ERRORS" | "FAILED" | "SKIPPED";

interface DriveAccount {
  id: string;
  name: string;
  googleEmail: string | null;
}

interface DriveFolder {
  id: string;
  name: string;
  driveAccountId: string;
}

interface UploadFileResult {
  fileName: string;
  category: FileCategory;
  status: FileStatus;
  driveFileId?: string;
  error?: string;
}

interface UploadGroupResult {
  status: GroupStatus;
  files: UploadFileResult[];
}

interface UploadResult {
  status: "COMPLETED" | "COMPLETED_WITH_ERRORS" | "FAILED";
  sessionId?: string;
  driveAccountName?: string;
  driveFolderName?: string;
  mode?: UploadMode;
  images?: UploadGroupResult;
  videos?: UploadGroupResult;
  unsupported?: UploadFileResult[];
  error?: string;
}

interface SelectedFilePreview {
  file: File;
  category: FileCategory;
}

const MODES: UploadMode[] = ["SEQUENTIAL", "PARALLEL"];
const IMAGE_EXTENSIONS = new Set(["avif", "bmp", "gif", "heic", "heif", "jpeg", "jpg", "png", "svg", "webp"]);
const VIDEO_EXTENSIONS = new Set(["avi", "m4v", "mkv", "mov", "mp4", "mpeg", "mpg", "webm", "wmv"]);

function inferCategory(file: File): FileCategory {
  if (file.type.startsWith("image/")) return "IMAGE";
  if (file.type.startsWith("video/")) return "VIDEO";
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (IMAGE_EXTENSIONS.has(extension)) return "IMAGE";
  if (VIDEO_EXTENSIONS.has(extension)) return "VIDEO";
  return "UNSUPPORTED";
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function badgeClass(value: string) {
  if (["COMPLETED", "IMAGE"].includes(value)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["FAILED", "UNSUPPORTED"].includes(value)) return "border-rose-200 bg-rose-50 text-rose-700";
  if (["VIDEO", "RUNNING", "UPLOADING"].includes(value)) return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(value)}`}>{value}</span>;
}

function FileResultRow({ file }: { file: UploadFileResult }) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-zinc-900">{file.fileName}</p>
        {file.driveFileId ? <p className="mt-1 text-xs text-zinc-500">Drive ID: {file.driveFileId}</p> : null}
        {file.error ? <p className="mt-1 text-xs text-rose-600">{file.error}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <StatusBadge value={file.category} />
        <StatusBadge value={file.status} />
      </div>
    </div>
  );
}

function ResultGroup({ title, group }: { title: string; group?: UploadGroupResult }) {
  if (!group) return null;
  return (
    <section className="rounded-md border border-zinc-300 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
        <StatusBadge value={group.status} />
      </div>
      {group.files.length === 0 ? <p className="mt-3 text-sm text-zinc-500">No files in this group.</p> : <div className="mt-3 divide-y divide-zinc-200">{group.files.map((file, index) => <FileResultRow file={file} key={`${file.fileName}-${index}`} />)}</div>}
    </section>
  );
}

export default function Home() {
  const [accounts, setAccounts] = useState<DriveAccount[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [driveAccountId, setDriveAccountId] = useState("");
  const [driveFolderId, setDriveFolderId] = useState("");
  const [mode, setMode] = useState<UploadMode>("SEQUENTIAL");
  const [selectedFiles, setSelectedFiles] = useState<SelectedFilePreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/drive-accounts")
      .then(async (response) => {
        const data = (await response.json()) as { accounts?: DriveAccount[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Cannot load Drive accounts.");
        return data;
      })
      .then((data) => {
        const loadedAccounts = data.accounts ?? [];
        setAccounts(loadedAccounts);
        if (loadedAccounts[0]) setDriveAccountId(loadedAccounts[0].id);
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Cannot load Drive accounts."),
      );
  }, []);

  useEffect(() => {
    if (!driveAccountId) return;

    fetch(`/api/drive-accounts/${driveAccountId}/folders`)
      .then((response) => response.json())
      .then((data: { folders: DriveFolder[] }) => {
        setFolders(data.folders);
        setDriveFolderId(data.folders[0]?.id ?? "");
      })
      .catch(() => setError("Cannot load folders."));
  }, [driveAccountId]);

  const canUpload = Boolean(driveAccountId && driveFolderId && mode && selectedFiles.length > 0 && !isUploading);
  const imageCount = selectedFiles.filter((item) => item.category === "IMAGE").length;
  const videoCount = selectedFiles.filter((item) => item.category === "VIDEO").length;
  const unsupportedCount = selectedFiles.filter((item) => item.category === "UNSUPPORTED").length;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles(files.map((file) => ({ file, category: inferCategory(file) })));
    setResult(null);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUpload) return;
    setIsUploading(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append("driveAccountId", driveAccountId);
    formData.append("driveFolderId", driveFolderId);
    formData.append("mode", mode);
    selectedFiles.forEach(({ file }) => formData.append("files", file));

    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = (await response.json()) as UploadResult;
      if (!response.ok) throw new Error(data.error || `Upload failed with HTTP ${response.status}`);
      setResult(data);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-4 flex items-center justify-between rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-800 text-xs font-bold text-white">DU</div>
            <div>
              <h1 className="text-sm font-bold text-zinc-900">Drive Upload</h1>
              <p className="text-xs text-zinc-500">Upload images and videos to Google Drive</p>
            </div>
          </div>
          <Link className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50" href="/admin/drive-accounts">Manage Drives</Link>
        </header>

        <form className="grid gap-5 rounded-lg border border-zinc-300 bg-white p-5 shadow-sm sm:p-6 lg:grid-cols-[1fr_20rem]" onSubmit={handleSubmit}>
          <section className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Drive account</span>
                <select className="mt-1.5 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" value={driveAccountId} onChange={(event) => setDriveAccountId(event.target.value)}>
                  {accounts.length === 0 ? <option value="">No Drive accounts</option> : accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Folder to</span>
                <select className="mt-1.5 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" value={driveFolderId} onChange={(event) => setDriveFolderId(event.target.value)}>
                  {folders.length === 0 ? <option value="">No folders</option> : folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                </select>
              </label>
            </div>

            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Upload mode</legend>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {MODES.map((option) => <label className={`flex h-10 cursor-pointer items-center justify-center rounded-md border px-3 text-xs font-bold transition ${mode === option ? "border-zinc-800 bg-zinc-800 text-white" : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400"}`} key={option}><input className="sr-only" name="mode" type="radio" value={option} checked={mode === option} onChange={() => setMode(option)} />{option}</label>)}
              </div>
            </fieldset>

            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-6 text-center transition hover:border-zinc-400 hover:bg-zinc-100">
              <span className="text-sm font-semibold text-zinc-900">Select files</span>
              <span className="mt-1 max-w-md text-xs leading-5 text-zinc-500">Pick multiple image or video files. Unsupported files are shown locally and are not uploaded.</span>
              <input className="sr-only" multiple type="file" onChange={handleFileChange} />
            </label>

            <div className="rounded-md border border-zinc-300 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
                <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Selected files</h2>
                <div className="flex flex-wrap gap-2"><StatusBadge value={`${imageCount} IMAGE`} /><StatusBadge value={`${videoCount} VIDEO`} /><StatusBadge value={`${unsupportedCount} UNSUPPORTED`} /></div>
              </div>
              {selectedFiles.length === 0 ? <p className="px-4 py-6 text-sm text-zinc-500">No files selected yet.</p> : <div className="max-h-72 divide-y divide-zinc-200 overflow-auto">{selectedFiles.map(({ file, category }, index) => <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" key={`${file.name}-${file.lastModified}-${index}`}><div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-900">{file.name}</p><p className="mt-0.5 text-xs text-zinc-500">{formatBytes(file.size)}{file.type ? ` · ${file.type}` : " · MIME unavailable"}</p></div><StatusBadge value={category} /></div>)}</div>}
            </div>
          </section>

          <aside className="flex flex-col gap-4 rounded-md border border-zinc-300 bg-zinc-50 p-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Upload session</h2>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Uploads to the selected Drive account and mapped folder. Images and videos go to fixed subfolders.</p>
            </div>
            <dl className="grid gap-2 text-xs">
              <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2"><dt className="text-zinc-500">Drive</dt><dd className="text-right font-semibold text-zinc-900">{accounts.find((account) => account.id === driveAccountId)?.name ?? "None"}</dd></div>
              <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2"><dt className="text-zinc-500">Folder</dt><dd className="font-semibold text-zinc-900">{folders.find((folder) => folder.id === driveFolderId)?.name ?? "None"}</dd></div>
              <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2"><dt className="text-zinc-500">Mode</dt><dd className="font-semibold text-zinc-900">{mode}</dd></div>
              <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2"><dt className="text-zinc-500">Files</dt><dd className="font-semibold text-zinc-900">{selectedFiles.length}</dd></div>
            </dl>
            <button className="mt-auto inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500" disabled={!canUpload} type="submit">{isUploading ? "Uploading..." : "Upload to Drive"}</button>
            {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
          </aside>
        </form>

        {result ? <section className="mt-5 space-y-4"><div className="rounded-md border border-zinc-300 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-sm font-bold text-zinc-900">Upload result</h2><p className="mt-0.5 text-xs text-zinc-500">{result.driveAccountName} · {result.driveFolderName} · {result.mode ?? mode}</p>{result.sessionId ? <p className="mt-0.5 text-xs text-zinc-400">Session: {result.sessionId}</p> : null}</div><StatusBadge value={result.status} /></div>{result.error ? <p className="mt-3 text-xs text-rose-600">{result.error}</p> : null}</div><div className="grid gap-4 lg:grid-cols-2"><ResultGroup title="Images" group={result.images} /><ResultGroup title="Videos" group={result.videos} /></div>{result.unsupported && result.unsupported.length > 0 ? <section className="rounded-md border border-zinc-300 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-bold text-zinc-900">Unsupported files</h3><StatusBadge value={`${result.unsupported.length} UNSUPPORTED`} /></div><div className="mt-3 divide-y divide-zinc-200">{result.unsupported.map((file, index) => <FileResultRow file={file} key={`${file.fileName}-${index}`} />)}</div></section> : null}</section> : null}
      </div>
    </main>
  );
}
