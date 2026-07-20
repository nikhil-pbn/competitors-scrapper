import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "@/app/globals.css";
import { ThemeProvider, ThemeScript } from "@/components/theme";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Referring Domains Automation",
  description:
    "Fetch competitor referring domains from Ahrefs, enrich them with business contact details, and append to Google Sheets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("w-full antialiased font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-dvh w-full flex flex-col bg-background text-foreground">
        <ThemeScript />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
