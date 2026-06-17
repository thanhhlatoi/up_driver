import Link from "next/link";

import { getDatabaseConfigError, getMissingRuntimeConfig } from "@/lib/config";
import { prisma } from "@/lib/db";
import { DeleteAccountButton } from "./delete-account-button";

export const dynamic = "force-dynamic";

export default async function DriveAccountsPage() {
  const databaseConfigError = getDatabaseConfigError();
  const missingConfig = getMissingRuntimeConfig();

  if (databaseConfigError) {
    return <AdminConfigError message={databaseConfigError} missingConfig={missingConfig} />;
  }

  const accounts = await prisma.driveAccount.findMany({
    include: { _count: { select: { folders: true, uploadSessions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl bg-zinc-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">Admin</p>
            <h1 className="mt-2 text-3xl font-bold">Drive accounts</h1>
            <p className="mt-2 text-sm text-zinc-300">Connect Google accounts, manage mapped folders, and delete with explicit confirmation.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-zinc-950" href="/api/google/oauth/start">Connect Google Drive</Link>
            <Link className="rounded-2xl border border-white/20 px-4 py-3 text-sm font-bold text-white" href="/">Upload page</Link>
          </div>
        </header>

        <section className="grid gap-4">
          {accounts.length === 0 ? <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-500">No Drive accounts connected yet.</div> : accounts.map((account) => <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm" key={account.id}><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h2 className="text-xl font-bold">{account.name}</h2><p className="mt-1 text-sm text-zinc-500">{account.googleEmail ?? "Email unavailable"}</p><p className="mt-2 text-xs text-zinc-400">{account._count.folders} mapped folders · {account._count.uploadSessions} upload sessions</p><Link className="mt-4 inline-flex rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-800 hover:border-blue-300" href={`/admin/drive-accounts/${account.id}/folders`}>Manage folders</Link></div><DeleteAccountButton accountId={account.id} /></div></article>)}
        </section>
      </div>
    </main>
  );
}

function AdminConfigError({
  message,
  missingConfig,
}: {
  message: string;
  missingConfig: string[];
}) {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Configuration required</p>
        <h1 className="mt-3 text-3xl font-bold text-zinc-950">PostgreSQL is not configured</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-700">{message}</p>
        {missingConfig.length > 0 ? (
          <div className="mt-5 rounded-2xl bg-white p-4">
            <p className="text-sm font-bold text-zinc-900">Missing environment variables:</p>
            <ul className="mt-3 list-inside list-disc text-sm text-zinc-700">
              {missingConfig.map((key) => (
                <li key={key}>{key}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mt-5 text-sm text-zinc-600">
          After creating `.env.local`, stop the dev server and run `npm run dev` again.
        </p>
      </div>
    </main>
  );
}
