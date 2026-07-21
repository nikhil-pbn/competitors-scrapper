"use client";

import { Button } from "@/components/ui";

/** Clears the session cookie via /api/auth/logout, then reloads to the gate. */
export function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <Button
      variant="secondary"
      onClick={logout}
      className="h-8 px-2.5 text-xs"
      title="Sign out"
    >
      Log out
    </Button>
  );
}
