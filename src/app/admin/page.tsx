import Link from "next/link";

import { getCurrentUser, isAdminEmail } from "@/lib/auth/current-user";
import { auditConfigured, readAuditLog } from "@/lib/audit/store";
import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { AdminTools } from "@/components/admin";

export const dynamic = "force-dynamic";

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminPage() {
  const user = await getCurrentUser();

  // Admin-only. Password sessions are anonymous, so only a recognised Google
  // account (nikhil.kumar@…) reaches this. Everyone else gets a polite wall.
  if (!isAdminEmail(user)) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 items-center px-6 py-16">
        <Card className="gap-2 p-6 text-center">
          <h1 className="text-base font-semibold">Admin only</h1>
          <p className="text-sm text-muted-foreground">
            This page is restricted. Sign in with an authorised
            @practicenumbers.com account.
          </p>
          <Link href="/" className="text-sm text-primary hover:underline">
            ← Back to the app
          </Link>
        </Card>
      </main>
    );
  }

  const entries = await readAuditLog();
  const configured = auditConfigured();

  return (
    <main className="mx-auto w-full flex-1 px-6 py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Save audit log</h1>
          <p className="text-sm text-muted-foreground">
            Who saved to which competitor tab, and how many rows. Signed in as{" "}
            <span className="font-medium">{user}</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AdminTools entries={entries} />
          <Link href="/" className="text-sm text-primary hover:underline">
            ← App
          </Link>
        </div>
      </div>

      {!configured ? (
        <Card className="mb-4 gap-0 border-amber-300 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          No storage connected yet, so nothing is being recorded. In Vercel →
          Storage, create a <span className="font-medium">Blob</span> store,
          connect it to this project, and redeploy.
        </Card>
      ) : null}

      <Card className="gap-0 p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Competitor tab</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Added</TableHead>
              <TableHead className="text-right">Updated</TableHead>
              <TableHead className="text-right">Unchanged</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-muted-foreground"
                >
                  No saves recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap">
                    {formatTimestamp(e.timestamp)}
                  </TableCell>
                  <TableCell>{e.user}</TableCell>
                  <TableCell>{e.worksheet}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {e.received}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {e.added}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {e.updated}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {e.unchanged}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </main>
  );
}
