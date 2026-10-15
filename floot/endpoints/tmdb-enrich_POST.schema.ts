import { z } from "zod";
import superjson from "superjson";
import type { TmdbMatchPreview } from "../helpers/enrichTmdbTitle";

export const schema = z.object({
  titleIds: z.array(z.number().int().positive()).min(1).max(20),
  apply: z.boolean().default(false),
});

export type OutputType = {
  mode: "preview" | "apply";
  results: TmdbMatchPreview[] | unknown[];
};

export const enrichTmdb = async (
  body: z.input<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const input = schema.parse(body);
  const response = await fetch("/_api/tmdb-enrich", {
    method: "POST",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: superjson.stringify(input),
  });

  if (!response.ok) {
    const parsed = superjson.parse<{ error?: string }>(await response.text());
    throw new Error(parsed.error ?? "Unable to enrich TMDB metadata");
  }

  return superjson.parse<OutputType>(await response.text());
};