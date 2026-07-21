import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import "@/app/globals.css";
import { ThemeProvider, ThemeScript } from "@/components/theme";
import { PasswordGate } from "@/components/auth";
import { SESSION_COOKIE } from "@/lib/auth/config";
import { verifySession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Referring Domains Automation",
  description:
    "Fetch competitor referring domains from Ahrefs, enrich them with business contact details, and append to Google Sheets.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Gate the whole app at render time: without a valid session we render only
  // the password popup, so the dashboard markup/JS is never sent to the client.
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const authenticated = await verifySession(token);

  return (
    <html
      lang="en"
      className={cn("w-full antialiased font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-dvh w-full flex flex-col bg-background text-foreground">
        <ThemeScript />
        <ThemeProvider>
          {authenticated ? (
            children
          ) : (
            <PasswordGate googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID)} />
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
