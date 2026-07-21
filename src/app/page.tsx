import Link from "next/link";

import { Dashboard } from "@/features/dashboard";
import { ThemeToggle } from "@/components/theme";
import { LogoutButton } from "@/components/auth";
import { Button } from "@/components/ui";
import { isCurrentUserAdmin } from "@/lib/auth/current-user";

export default async function Home() {
  const admin = await isCurrentUserAdmin();
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
              RD
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight">
                Referring Domains Automation
              </h1>
              <p className="text-xs text-muted-foreground">
                Ahrefs → Website Analyzer → Google Sheets
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {admin ? (
              <Button
                asChild
                variant="secondary"
                className="h-8 px-2.5 text-xs"
              >
                <Link href="/admin">Admin</Link>
              </Button>
            ) : null}
            <LogoutButton />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full flex-1 px-6 py-8">
        <Dashboard />
      </main>
    </div>
  );
}
