import type { TraktSyncResult } from "./traktSync";

// AF-20261023-03 (October 23, 2026): the automation account only checks screens, so it never starts a Trakt sync
// (a full history sync that writes Dave's data). It gets the usual result shape with nothing synced.
export const skippedTraktSync = (now = new Date()): TraktSyncResult => ({
  runId: 0, startAt: now, fetched: 0, inserted: 0, updated: 0, skipped: 0, unmapped: 0,
  lastHistoryAt: null, watchlistCount: 0, ratingsCount: 0,
});

export const runTraktSync = (isBot: boolean, sync: () => Promise<TraktSyncResult>): Promise<TraktSyncResult> =>
  isBot ? Promise.resolve(skippedTraktSync()) : sync();

// A second sync started while one is running (two tabs or devices) is a clean 409, not a 500.
export const traktSyncErrorStatus = (message: string) =>
  message.includes("duplicate key") || message.includes("IMPORT_ALREADY_RUNNING") ? 409
    : message.includes("not connected") ? 400 : 500;
