"use client";

import { useState } from "react";

export function DeleteAccountButton({ accountId }: { accountId: string }) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    if (confirmText !== "DELETE DRIVE ACCOUNT") return;
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/drive-accounts/${accountId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Delete failed");
      window.location.reload();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="min-w-72 rounded-2xl border border-rose-200 bg-rose-50 p-3">
      <p className="text-xs font-semibold text-rose-700">Type DELETE DRIVE ACCOUNT to delete this account, all mapped Drive folders, and upload history.</p>
      <input className="mt-2 h-10 w-full rounded-xl border border-rose-200 bg-white px-3 text-sm outline-none" value={confirmText} onChange={(event) => setConfirmText(event.target.value)} placeholder="DELETE DRIVE ACCOUNT" />
      <button className="mt-2 h-10 w-full rounded-xl bg-rose-600 px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-rose-300" disabled={confirmText !== "DELETE DRIVE ACCOUNT" || isDeleting} onClick={deleteAccount} type="button">{isDeleting ? "Deleting..." : "Delete Drive account"}</button>
      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
