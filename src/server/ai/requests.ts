export async function boundedJSON(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0]?.trim() !==
    "application/json"
  )
    return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
    );
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

/** Serialize billable operations per conversation or submitted attempt within the local server. */
const state = globalThis as typeof globalThis & {
  studioAIPending?: Set<string>;
};
const pending = (state.studioAIPending ??= new Set<string>());
export async function oncePending<T>(
  key: string,
  run: () => Promise<T>,
): Promise<T | null> {
  if (pending.has(key)) return null;
  pending.add(key);
  try {
    return await run();
  } finally {
    pending.delete(key);
  }
}
