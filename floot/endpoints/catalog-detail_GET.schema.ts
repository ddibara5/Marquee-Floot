import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({ titleId: z.coerce.number().int().positive() });
export type CatalogDetail = {
  genres: string[];
  runtimeMinutes: number | null;
  released: string | null;
  cast: string[];
  creators: string[];
  studios: string[];
  networks: string[];
  website: string;
};
export type OutputType = { detail: CatalogDetail | null };
export async function getCatalogDetail(titleId: number): Promise<OutputType> {
  const response = await fetch("/_api/catalog-detail?titleId=" + titleId);
  if (!response.ok) {
    const body = superjson.parse<{ error?: string }>(await response.text());
    throw new Error(body.error ?? "Unable to load catalog details");
  }
  return superjson.parse<OutputType>(await response.text());
}