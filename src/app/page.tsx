import { Dashboard } from "@/features/dashboard";
import { ThemeToggle } from "@/components/theme";

export default function Home() {
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
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full flex-1 px-6 py-8">
        <Dashboard />
      </main>
    </div>
  );
}
