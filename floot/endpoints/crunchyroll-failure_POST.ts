import {marqueeWriter} from "../helpers/marqueeWriter";
import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "../helpers/db";

const KEY_DIGEST = "5350b9b3746564b330a99ef5ba0c57954dfd639bd6df7d8c35bd8610b0ddc4ca";
const USER_ID = 1;

async function handleRequest(request: Request) {
  const key = request.headers.get("x-marquee-ingest-key");
  if (!key || !/^[a-f0-9]{64}$/.test(key) ||
      !timingSafeEqual(createHash("sha256").update(key).digest(), Buffer.from(KEY_DIGEST, "hex")))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const raw = await request.text();
    if (raw.length > 2_000) throw new Error("Invalid failure report");
    const input = JSON.parse(raw) as Record<string, unknown>;
    if (typeof input.stage !== "string" || !/^[a-zA-Z0-9 .:_-]{3,120}$/.test(input.stage) ||
        typeof input.executionId !== "string" || !/^n8n:[0-9]+$/.test(input.executionId))
      throw new Error("Invalid failure report");
    const message = "n8n collection failed at " + input.stage;
    await db.insertInto("marqueeCrunchyrollSyncRuns").values({
      userId: USER_ID, mode: "sync", status: "failed",
      finishedAt: new Date(), errorSummary: message,
    }).execute();
    await db.insertInto("marqueeCrunchyrollSyncState").values({
      userId: USER_ID, lastAttemptAt: new Date(), lastError: message,
    }).onConflict(oc => oc.column("userId").doUpdateSet({
      lastAttemptAt: new Date(), lastError: message, updatedAt: new Date(),
    })).execute();
    return Response.json({ recorded: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Invalid failure report" }, { status: 400 });
  }
}



export const handle = marqueeWriter.endpoint(handleRequest, "crunchyroll-failure_POST.ts");
