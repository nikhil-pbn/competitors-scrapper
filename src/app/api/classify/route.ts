import { type NextRequest } from "next/server";
import { z } from "zod";

import { classifyDomains } from "@/lib/dental/classify-site";

export const dynamic = "force-dynamic";
// Each domain may need two page fetches; large lists take a while.
export const maxDuration = 300;

const classifySchema = z.object({
  domains: z.array(z.string().min(1).max(2048)).min(1, "domains must not be empty"),
  concurrency: z.number().int().min(1).max(20).optional(),
});

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * POST /api/classify — pre-analyze dental check. Streams Server-Sent Events:
 *   event: progress  -> { done, total, domain, check }
 *   event: done      -> { total }
 *   event: error     -> { error }
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = classifySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { domains, concurrency } = parsed.data;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (chunk: string) =>
        controller.enqueue(encoder.encode(chunk));
      try {
        await classifyDomains(domains, {
          concurrency,
          onProgress: (p) => enqueue(sse("progress", p)),
        });
        enqueue(sse("done", { total: domains.length }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Dental check failed.";
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
