import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  titleId: z.coerce.number().int().positive(),
  season: z.coerce.number().int().min(0),
  episode: z.coerce.number().int().positive(),
});
export type OutputType = { overview: string | null; stillPath: string | null; runtimeMinutes: number | null };
export async function getEpisodeCatalog(titleId: number, season: number, episode: number): Promise<OutputType> {
  const response = await fetch(`/_api/episode-catalog?titleId=${titleId}&season=${season}&episode=${episode}`);
  if (!response.ok) throw new Error("Episode information is unavailable");
  return superjson.parse<OutputType>(await response.text());
}