import { z } from "zod";
import superjson from "superjson";
import { batchedFetch } from "../helpers/batchedFetch";

export const schema = z.object({});

export type TraktRunSummary = {
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  unmapped: number;
  error: string | null;
};

export type OutputType = {
  connected: boolean;
  tokenExpiresAt: Date | null;
  awaiting: {
    userCode: string;
    verificationUrl: string;
    expiresAt: Date;
  } | null;
  lastSyncAt: Date | null;
  lastHistoryAt: Date | null;
  lastError: string | null;
  latestRun: TraktRunSummary | null;
  personal: {
    lastSuccessAt: Date | null;
    lastError: string | null;
    watchlistCount: number;
    ratingsCount: number;
  } | null;
};

export const getTraktStatus = async (
  body: z.infer<typeof schema> = {},
  init?: RequestInit
): Promise<OutputType> => {
  const response = await batchedFetch("/_api/trakt-status", {
    method: "GET",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const parsed = superjson.parse<{ error?: string }>(await response.text());
    throw new Error(parsed.error ?? "Unable to load Trakt status");
  }

  return superjson.parse<OutputType>(await response.text());
};