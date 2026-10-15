import superjson from "superjson";
export type OutputType = {
  connected: boolean; profileReady: boolean; lastSuccessAt: Date | null;
  lastAttemptAt: Date | null; lastError: string | null; fetched: number | null;
  newEvents: number | null; held: number;
};
export async function getCrunchyrollStatus(): Promise<OutputType> {
  const response = await fetch("/_api/crunchyroll-status");
  const payload = superjson.parse<OutputType & { error?: string }>(await response.text());
  if (!response.ok) throw new Error(payload.error ?? "Unable to load Crunchyroll status");
  return payload;
}