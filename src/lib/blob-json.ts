/**
 * Read a byte ReadableStream as parsed JSON by draining it manually.
 *
 * We deliberately avoid `new Response(stream).json()` / `.arrayBuffer()`:
 * under Node/undici those can call `ArrayBuffer.transfer` on pooled buffers,
 * which throws "ArrayBuffer is not detachable and could not be cloned" and
 * crashes the response. Decoding chunks straight to text sidesteps that.
 */
export async function readStreamJson(
  stream: ReadableStream<Uint8Array>,
): Promise<unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return text.trim() ? JSON.parse(text) : null;
}
