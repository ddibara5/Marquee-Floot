import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({});
/** Crunchyroll anime whose next episode (S1 E1 if unstarted) was checked in the last 3 days. */
export type OutputType = { dubs: { titleId: number; hasEnDub: boolean }[] };

export async function getDubStatus(): Promise<OutputType> {
  const response = await fetch("/_api/dub-status", { method: "GET" });
  if (!response.ok) {
    const body = superjson.parse<{ error?: string }>(await response.text());
    throw new Error(body.error ?? "Unable to load dub status");
  }
  return superjson.parse<OutputType>(await response.text());
}
