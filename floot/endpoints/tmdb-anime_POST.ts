import {marqueeWriter} from "../helpers/marqueeWriter";
import { createHash, timingSafeEqual } from "node:crypto";
import { matchAnimeTmdb } from "../helpers/matchAnimeTmdb";
import { refreshTmdbMetadata } from "../helpers/refreshTmdbMetadata";

const KEY_DIGEST = "5350b9b3746564b330a99ef5ba0c57954dfd639bd6df7d8c35bd8610b0ddc4ca";

async function handleRequest(request: Request) {
  const key = request.headers.get("x-marquee-ingest-key");
  if (!key || !/^[a-f0-9]{64}$/.test(key) ||
      !timingSafeEqual(createHash("sha256").update(key).digest(), Buffer.from(KEY_DIGEST, "hex")))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.text();
    if (body.length > 200) return Response.json({ error: "Invalid request" }, { status: 400 });
    const input = JSON.parse(body) as { apply?: unknown };
    if (typeof input.apply !== "boolean") return Response.json({ error: "Invalid request" }, { status: 400 });
    const matches = await matchAnimeTmdb(input.apply);
    const refreshed = input.apply ? await refreshTmdbMetadata(25) : null;
    return Response.json({ matches, refreshed }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "TMDB anime matching failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}



export const handle = marqueeWriter.endpoint(handleRequest, "tmdb-anime_POST.ts");
