import Link from "next/link";

import { ResearchWorkspace } from "@/components/research/research-workspace";

export const dynamic = "force-dynamic";

/**
 * Thin shell — no server-side data reads. The client ResearchWorkspace loads
 * the list + worksheet names from API routes, so this page can't hit RSC
 * streaming problems.
 */
export default function NoDataPage() {
  return (
    <main className="mx-auto w-full flex-1 px-6 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">
            No-data URLs · manual research
          </h1>
          <p className="text-sm text-muted-foreground">
            Fill in details you find, then push a row into a competitor tab.
            Pushed rows leave this list.
          </p>
        </div>
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Back to the app
        </Link>
      </div>
      <ResearchWorkspace />
    </main>
  );
}
