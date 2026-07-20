import { type NextRequest } from "next/server";
import { z } from "zod";

import { analyzeDomains } from "@/lib/analyzer/scraper";

export const dynamic = "force-dynamic";
// Website analysis can take a while for large domain lists.
export const maxDuration = 300;

const analyzeSchema = z.object({
  domains: z.array(z.string().min(1)).min(1, "domains must not be empty"),
  concurrency: z.number().int().min(1).max(20).optional(),
});

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * POST /api/analyze — Phase 2. Streams Server-Sent Events:
 *   event: progress  -> { done, total, record }
 *   event: done      -> { records }
 *   event: error     -> { error }
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = analyzeSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request.", issues: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { domains, concurrency } = parsed.data;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (chunk: string) =>
        controller.enqueue(encoder.encode(chunk));
      try {
        const records = await analyzeDomains(domains, {
          concurrency,
          onProgress: (p) => enqueue(sse("progress", p)),
        });
        enqueue(sse("done", { records }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Analysis failed.";
        enqueue(sse("error", { error: message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
