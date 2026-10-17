import { z } from "zod";
import superjson from "superjson";
import { batchedFetch } from "../helpers/batchedFetch";

export const schema = z.object({});
export type OutputType = {
  monthly: { month: string; episodes: number; movies: number }[];
  mostWatched: { titleId: number; title: string; watches: number }[];
  ratings: { titleId: number; score: number }[];
  statuses: { titleId: number; status: string }[];
  recentEpisodes: number;
  recentMovies: number;
  datedEvents: number;
};
export async function getInsightsContext(): Promise<OutputType> {
  const response = await batchedFetch("/_api/insights-context", { method: "GET" });
  if (!response.ok) {
    const body = superjson.parse<{ error?: string }>(await response.text());
    throw new Error(body.error ?? "Unable to load viewing trends");
  }
  return superjson.parse<OutputType>(await response.text());
}