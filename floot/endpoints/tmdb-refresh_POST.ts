import {marqueeWriter} from "../helpers/marqueeWriter";
import { createHash, timingSafeEqual } from "node:crypto";
import { refreshTmdbMetadata } from "../helpers/refreshTmdbMetadata";

const KEY_DIGEST = "5350b9b3746564b330a99ef5ba0c57954dfd639bd6df7d8c35bd8610b0ddc4ca";

async function handleRequest(request: Request) {
  const key = request.headers.get("x-marquee-ingest-key");
  if (!key || !/^[a-f0-9]{64}$/.test(key) ||
      !timingSafeEqual(createHash("sha256").update(key).digest(), Buffer.from(KEY_DIGEST, "hex")))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await refreshTmdbMetadata(25);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "TMDB refresh failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}



export const handle = marqueeWriter.endpoint(handleRequest, "tmdb-refresh_POST.ts");
