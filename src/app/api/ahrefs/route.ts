import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { fetchReferringDomains } from "@/lib/ahrefs/client";

export const dynamic = "force-dynamic";

const filtersSchema = z.object({
  domainKeyword: z.string().optional(),
  status: z.enum(["all", "new", "lost"]).optional(),
  linkStatus: z
    .enum([
      "any",
      "newly_published",
      "link_added",
      "link_restored",
      "link_removed",
      "link_lost",
    ])
    .optional(),
  sinceLastMonth: z.boolean().optional(),
  limit: z.number().int().min(1).max(5000).optional(),
});

const searchSchema = z.object({
  target: z.string().min(1, "target is required"),
  filters: filtersSchema.default({}),
});

/** POST /api/ahrefs — fetch filtered referring domains (Phase 1). */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const domains = await fetchReferringDomains({
      target: parsed.data.target,
      filters: parsed.data.filters,
    });
    return NextResponse.json({ domains, count: domains.length });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch from Ahrefs.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
