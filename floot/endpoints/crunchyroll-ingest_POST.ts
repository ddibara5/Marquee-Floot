import {marqueeWriter} from "../helpers/marqueeWriter";
import { createHash, timingSafeEqual } from "node:crypto";
import { marqueeLegacyLock } from "../helpers/marqueeLegacyLock";
import { syncCrunchyroll, type Window } from "../helpers/crunchyrollSync";

const KEY_DIGEST = "5350b9b3746564b330a99ef5ba0c57954dfd639bd6df7d8c35bd8610b0ddc4ca";
const USER_ID = 1; // Single-user Marquee pilot; never accept a user ID from the caller.

function authorized(request: Request) {
  const key = request.headers.get("x-marquee-ingest-key");
  if (!key || !/^[a-f0-9]{64}$/.test(key)) return false;
  const received = createHash("sha256").update(key).digest();
  return timingSafeEqual(received, Buffer.from(KEY_DIGEST, "hex"));
}

async function handleRequest(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const raw = await request.text();
    if (raw.length > 4_000_000) return Response.json({ error: "Window too large" }, { status: 413 });
    const input = JSON.parse(raw) as Record<string, unknown>;
    const accountId = input.p_account_id;
    const events = input.p_events;
    const executionId = input.p_execution_id;
    if (typeof accountId !== "string" || !/^[a-zA-Z0-9-]{10,128}$/.test(accountId) ||
        typeof executionId !== "string" || !/^n8n:[0-9]+$/.test(executionId) ||
        !Array.isArray(events) || events.length < 40 || events.length > 400)
      throw new Error("Invalid Crunchyroll window");
    const seen = new Set<string>();
    for (const value of events) {
      if (!value || typeof value !== "object") throw new Error("Invalid history item");
      const event = value as Record<string, unknown>;
      if (typeof event.id !== "string" || !event.id || seen.has(event.id) ||
          typeof event.date_played !== "string" ||
          !/^\d{4}-\d\d-\d\dT/.test(event.date_played) ||
          !Number.isFinite(Date.parse(event.date_played)) ||
          typeof event.fully_watched !== "boolean")
        throw new Error("Invalid or repeated history item");
      seen.add(event.id);
    }
    const result = await marqueeLegacyLock("crunchyroll", () => syncCrunchyroll(USER_ID, "sync", { accountId, events } as Window));
    return Response.json({ ...result, executionId }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Crunchyroll ingest failed";
    return Response.json({ error: message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}



export const handle = marqueeWriter.endpoint(handleRequest, "crunchyroll-ingest_POST.ts");
