import { z } from "zod";
import superjson from "superjson";

const titleId = z.number().int().positive();
export const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("log"),
    kind: z.enum(["episode", "movie"]),
    titleId,
    episodeId: z.number().int().positive().optional(),
    requestId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("undo"),
    kind: z.enum(["episode", "movie"]),
    titleId,
    episodeId: z.number().int().positive().optional(),
    eventId: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("unwatch"),
    titleId,
    episodeId: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("markEarlier"),
    titleId,
    episodeId: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("moveEarlier"),
    titleId,
    episodeId: z.number().int().positive(),
    eventId: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("season"),
    titleId,
    seasonId: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("seasonUndo"),
    titleId,
    seasonId: z.number().int().positive(),
  }),
  z.object({ action: z.literal("series"), titleId }),
  z.object({ action: z.literal("seriesUndo"), titleId }),
  z.object({
    action: z.literal("rating"),
    titleId,
    rating: z.number().int().min(1).max(10).nullable(),
  }),
  z.object({
    action: z.literal("status"),
    titleId,
    status: z.enum(["planned", "watching", "completed", "paused", "dropped"]).nullable(),
  }),
  z.object({
    action: z.literal("viewing"),
    titleId,
    status: z.enum(["planned", "watching", "completed", "paused", "dropped"]).nullable(),
  }),
  z.object({
    action: z.literal("watchlistLocal"),
    titleId,
    saved: z.boolean(),
  }),
]);

export type OutputType = { saved: true; synced?: boolean; message?: string; eventId?: number };
export async function changeTracking(body: z.input<typeof schema>): Promise<OutputType> {
  const response = await fetch("/_api/tracking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: superjson.stringify(schema.parse(body)),
  });
  const payload = superjson.parse<OutputType & { error?: string }>(await response.text());
  if (!response.ok) throw new Error(payload.error ?? "Unable to save tracking");
  return payload;
}