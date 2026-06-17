"use client";

import { useState } from "react";

export function CreateFolderForm({ driveAccountId }: { driveAccountId: string }) {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createFolder() {
    if (!name.trim()) return;
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/drive-accounts/${driveAccountId}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Create folder failed");
      window.location.reload();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Create folder failed");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Create folder</h2>
      <p className="mt-2 text-sm text-zinc-500">Creates the top-level folder on Google Drive and automatically creates Images and Videos inside it.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input className="h-12 flex-1 rounded-2xl border border-zinc-200 px-4 text-sm outline-none focus:border-blue-500" value={name} onChange={(event) => setName(event.target.value)} placeholder="Project_X" />
        <button className="h-12 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-zinc-300" disabled={!name.trim() || isCreating} onClick={createFolder} type="button">{isCreating ? "Creating..." : "Create folder"}</button>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

export function DeleteFolderButton({ folderId, folderName }: { folderId: string; folderName: string }) {
  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteFolder() {
    if (confirmName !== folderName) return;
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/drive-folders/${folderId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmFolderName: confirmName }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Delete folder failed");
      window.location.reload();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete folder failed");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="min-w-72 rounded-2xl border border-rose-200 bg-rose-50 p-3">
      <p className="text-xs font-semibold text-rose-700">Type {folderName} to delete this Google Drive folder, its Images/Videos folders, files, and upload history.</p>
      <input className="mt-2 h-10 w-full rounded-xl border border-rose-200 bg-white px-3 text-sm outline-none" value={confirmName} onChange={(event) => setConfirmName(event.target.value)} placeholder={folderName} />
      <button className="mt-2 h-10 w-full rounded-xl bg-rose-600 px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-rose-300" disabled={confirmName !== folderName || isDeleting} onClick={deleteFolder} type="button">{isDeleting ? "Deleting..." : "Delete folder"}</button>
      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
