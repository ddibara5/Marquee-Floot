import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({});

export type OutputType = {
  status: "awaiting";
  userCode: string;
  verificationUrl: string;
  expiresAt: Date;
  intervalSeconds: number;
};

export const startTraktAuth = async (
  body: z.infer<typeof schema> = {},
  init?: RequestInit
): Promise<OutputType> => {
  const response = await fetch("/_api/trakt-auth-start", {
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
    throw new Error(parsed.error ?? "Unable to start Trakt authorization");
  }

  return superjson.parse<OutputType>(await response.text());
};