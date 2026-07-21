"use client";

import { useState } from "react";

import { Button, Card, Input } from "@/components/ui";

const AUTH_ERRORS: Record<string, string> = {
  domain: "That account isn't a @practicenumbers.com address.",
  state: "Your sign-in link expired. Please try again.",
  google: "Google sign-in failed. Please try again.",
  config: "Google sign-in isn't set up yet.",
};

/** Reads a ?authError=… left by the Google callback (client-only). */
function initialOauthError(): string | null {
  if (typeof window === "undefined") return null;
  const code = new URLSearchParams(window.location.search).get("authError");
  return code ? (AUTH_ERRORS[code] ?? "Sign-in failed.") : null;
}

/**
 * Full-screen sign-in popup rendered (server-side, by the layout) in place of
 * the app whenever there's no valid session — so the dashboard is never sent to
 * the browser unauthenticated. Two ways in: the shared password, or Google
 * sign-in restricted to @practicenumbers.com. Both set the same session cookie.
 */
export function PasswordGate({ googleEnabled }: { googleEnabled?: boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oauthError] = useState<string | null>(initialOauthError);

  async function submit() {
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Incorrect password.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm gap-0 p-6">
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
            RD
          </div>
          <h1 className="text-base font-semibold">
            Referring Domains Automation
          </h1>
          <p className="text-sm text-muted-foreground">Sign in to continue.</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="flex flex-col gap-3"
        >
          <Input
            type="password"
            value={password}
            autoFocus
            placeholder="Team password"
            disabled={busy}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={busy || !password}>
            {busy ? "Checking…" : "Unlock with password"}
          </Button>
        </form>

        {googleEnabled ? (
          <>
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                window.location.href = "/api/auth/google";
              }}
            >
              <GoogleIcon />
              Continue with Google
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Only @practicenumbers.com accounts.
            </p>
          </>
        ) : null}

        <div suppressHydrationWarning>
          {oauthError ? (
            <p className="mt-3 text-center text-sm text-destructive">
              {oauthError}
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
