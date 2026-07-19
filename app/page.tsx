import { Dashboard } from "./components/dashboard";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
              RD
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight">
                Referring Domains Automation
              </h1>
              <p className="text-xs text-muted">
                Ahrefs → Website Analyzer → Google Sheets
              </p>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <Dashboard />
      </main>
    </div>
  );
}
