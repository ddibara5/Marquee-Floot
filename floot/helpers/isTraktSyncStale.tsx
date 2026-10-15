export const isTraktSyncStale = (
  lastSyncAt: Date | string | null | undefined,
  now: number = Date.now(),
  staleAfterMs: number = 6 * 60 * 60 * 1000
) => {
  if (!lastSyncAt) return true;
  const timestamp = new Date(lastSyncAt).getTime();
  if (!Number.isFinite(timestamp)) return true;
  return now - timestamp >= staleAfterMs;
};