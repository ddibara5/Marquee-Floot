import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({});
export type PersonalRow = {
  id: string;
  titleId: number | null;
  mediaType: string;
  traktId: string;
  tmdbId?: number | null;
  source?: "trakt" | "local";
  title: string;
  year: number | null;
  rating?: number | null;
  tasteEligible?: boolean;
  pendingAction: string | null;
  posterPath?: string | null;
  overview?: string | null;
  catalogStatus?: string | null;
  isAnime?: boolean;
  activityAt?: Date | null;
  releaseDate?: Date | null;
};
export type OutputType = {
  watchlist: PersonalRow[];
  ratings: PersonalRow[];
  mappings: Array<{ titleId: number; mediaType: string; traktId: string }>;
};
export const getPersonalState = async (): Promise<OutputType> => {
  const response = await fetch("/_api/personal-state");
  const payload = superjson.parse<any>(await response.text());
  if (!response.ok) throw new Error(payload.error ?? "Unable to load Trakt data");
  return payload;
};