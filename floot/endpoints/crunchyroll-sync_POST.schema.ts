import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({ action: z.enum(["preview", "confirm", "sync"]) });
export type OutputType = {
  saved: true;
  mode: "preview" | "confirm" | "sync";
  fetched?: number;
  newEvents?: number;
  mapped?: number;
  held?: number;
  profileReady: boolean;
};
export async function changeCrunchyrollSync(body: z.input<typeof schema>): Promise<OutputType> {
  const response = await fetch("/_api/crunchyroll-sync", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: superjson.stringify(schema.parse(body)),
  });
  const payload = superjson.parse<OutputType & { error?: string }>(await response.text());
  if (!response.ok) throw new Error(payload.error ?? "Crunchyroll sync failed");
  return payload;
}