import Link from "next/link";

import { prisma } from "@/lib/db";
import { CreateFolderForm, DeleteFolderButton } from "./folder-actions";

export const dynamic = "force-dynamic";

export default async function DriveFoldersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await prisma.driveAccount.findUnique({
    where: { id },
    include: { folders: { orderBy: { createdAt: "desc" }, include: { _count: { select: { uploadSessions: true } } } } },
  });

  if (!account) {
    return <main className="p-8">Drive account not found.</main>;
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <Link className="text-sm font-bold text-blue-700" href="/admin/drive-accounts">Back to Drive accounts</Link>
          <h1 className="mt-3 text-3xl font-bold">Folders in {account.name}</h1>
          <p className="mt-2 text-sm text-zinc-500">Create a top-level folder. The system automatically creates Images and Videos inside it and stores Google Drive folder IDs in PostgreSQL.</p>
        </header>

        <CreateFolderForm driveAccountId={account.id} />

        <section className="grid gap-4">
          {account.folders.length === 0 ? <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-500">No mapped folders yet.</div> : account.folders.map((folder) => <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm" key={folder.id}><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h2 className="text-xl font-bold">{folder.name}</h2><p className="mt-1 text-xs text-zinc-500">Parent: {folder.parentFolderId}</p><p className="mt-1 text-xs text-zinc-500">Images: {folder.imagesFolderId}</p><p className="mt-1 text-xs text-zinc-500">Videos: {folder.videosFolderId}</p><p className="mt-2 text-xs text-zinc-400">{folder._count.uploadSessions} upload sessions</p></div><DeleteFolderButton folderId={folder.id} folderName={folder.name} /></div></article>)}
        </section>
      </div>
    </main>
  );
}
