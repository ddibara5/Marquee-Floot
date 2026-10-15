import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({});

export type OutputType = {
  status: "pending" | "connected" | "expired" | "denied" | "not_started";
};

export const pollTraktAuth = async (
  body: z.infer<typeof schema> = {},
  init?: RequestInit
): Promise<OutputType> => {
  const response = await fetch("/_api/trakt-auth-poll", {
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
    throw new Error(parsed.error ?? "Unable to confirm Trakt authorization");
  }

  return superjson.parse<OutputType>(await response.text());
};