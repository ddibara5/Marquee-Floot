import { z } from "zod";
import superjson from "superjson";
import type { Selectable } from "kysely";
import type { MarqueeTitles } from "../helpers/schema";

export const schema = z.object({});

export type OutputType = {
  titles: Selectable<MarqueeTitles>[];
};

export const getTitles = async (
  body: z.infer<typeof schema> = {},
  init?: RequestInit
): Promise<OutputType> => {
  const result = await fetch("/_api/titles", {
    method: "GET",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!result.ok) {
    const parsed = superjson.parse<{ error?: string }>(await result.text());
    throw new Error(parsed.error ?? "Unable to load titles");
  }

  return superjson.parse<OutputType>(await result.text());
};