import { z } from "zod";
import superjson from "superjson";
import type { TraktSyncResult } from "../helpers/traktSync";

export const schema = z.object({});

export type OutputType = TraktSyncResult;

export const syncTrakt = async (
  body: z.infer<typeof schema> = {},
  init?: RequestInit
): Promise<OutputType> => {
  const response = await fetch("/_api/trakt-sync", {
    method: "POST",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: superjson.stringify(schema.parse(body)),
  });

  if (!response.ok) {
    const parsed = superjson.parse<{ error?: string }>(await response.text());
    throw new Error(parsed.error ?? "Unable to sync Trakt history");
  }

  return superjson.parse<OutputType>(await response.text());
};