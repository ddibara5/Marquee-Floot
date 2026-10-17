// Reads made in the same moment travel as one request to /_api/batch, like GameDeck's native-data batching
// (October 17): Home's six reads become one round trip. A lone read goes straight out, anything but a plain GET is
// never batched, and if the batch fails each read is simply sent on its own.
const WINDOW_MS = 10;
const MAX_BATCH = 9;

type Waiting = { path: string; resolve: (response: Response) => void; reject: (error: unknown) => void };
let queue: Waiting[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

const direct = (item: Waiting) => fetch(item.path).then(item.resolve, item.reject);
const toResponse = ({ status, body }: { status: number; body: string }) =>
  new Response(status === 204 || status === 304 ? null : body, { status, headers: { "Content-Type": "application/json" } });

async function flush() {
  const items = queue.splice(0, MAX_BATCH);
  timer = queue.length ? setTimeout(flush, 0) : null;
  if (items.length === 1) return void direct(items[0]);
  try {
    const response = await fetch("/_api/batch?paths=" + encodeURIComponent(items.map(item => item.path).join(",")));
    if (!response.ok) throw new Error("Batch failed: " + response.status);
    const { results } = (await response.json()) as { results: { status: number; body: string }[] };
    if (!Array.isArray(results) || results.length !== items.length) throw new Error("Batch answer does not match");
    items.forEach((item, index) => item.resolve(toResponse(results[index])));
  } catch {
    items.forEach(item => void direct(item));
  }
}

export function batchedFetch(path: string, init?: RequestInit): Promise<Response> {
  if ((init?.method ?? "GET").toUpperCase() !== "GET" || init?.body || init?.signal || !path.startsWith("/_api/")) return fetch(path, init);
  return new Promise((resolve, reject) => {
    queue.push({ path, resolve, reject });
    timer ??= setTimeout(flush, WINDOW_MS);
  });
}
