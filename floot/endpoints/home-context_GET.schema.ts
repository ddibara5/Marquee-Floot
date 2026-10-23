import { z } from "zod";
import superjson from "superjson";
import { batchedFetch } from "../helpers/batchedFetch";

export const schema = z.object({});
export type NextEpisode = {
  titleId: number;
  episodeId: number;
  seasonNumber: number | null;
  episodeNumber: number | null;
  episodeTitle: string | null;
  airedAt: Date | null;
  stillPath: string | null;
  lastWatchedAt: Date | null;
  // Added October 12, 2026 (additive, optional for older clients).
  overview?: string | null;
  runtimeMinutes?: number | null;
  readyCount?: number;
};
/** One Eastern calendar day; date is YYYY-MM-DD. */
export type WeekDay = { date: string; episodes: number; movies: number };
export type UpcomingEpisode = {
  titleId: number;
  seasonNumber: number | null;
  episodeNumber: number | null;
  episodeTitle: string | null;
  /** Date-only air date stored at midnight UTC. */
  airedAt: Date;
};
export type LastEpisode = {
  titleId: number;
  seasonNumber: number | null;
  episodeNumber: number | null;
  episodeTitle: string | null;
  watchedAt: Date;
};
export type OutputType = {
  nextEpisodes: NextEpisode[];
  week?: { days: WeekDay[]; titles: number };
  upcoming?: UpcomingEpisode[];
  lastEpisodes?: LastEpisode[];
  // Added October 23, 2026 for the desktop calendar (additive, optional for older clients).
  /** First episode per show per air day, today through 60 days ahead. */
  calendar?: UpcomingEpisode[];
  /** Each Eastern day of the current month so far. */
  monthDays?: WeekDay[];
};

export async function getHomeContext(): Promise<OutputType> {
  const response = await batchedFetch("/_api/home-context", { method: "GET" });
  if (!response.ok) {
    const body = superjson.parse<{ error?: string }>(await response.text());
    throw new Error(body.error ?? "Unable to load next episodes");
  }
  return superjson.parse<OutputType>(await response.text());
}
