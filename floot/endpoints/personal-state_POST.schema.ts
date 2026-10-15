import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  kind:z.enum(["watchlist","rating"]),
  mediaType:z.enum(["movie","show"]),
  traktId:z.string().regex(/^\d+$/),
  action:z.enum(["add","remove","set"]),
  rating:z.number().int().min(1).max(10).optional(),
}).refine(value => value.kind === "watchlist"
  ? value.action !== "set"
  : value.action !== "add" && (value.action !== "set" || value.rating !== undefined));
export type OutputType = { saved:boolean; synced:boolean; message:string };
export const changePersonalState = async (
  body:z.input<typeof schema>
):Promise<OutputType> => {
  const response = await fetch("/_api/personal-state",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:superjson.stringify(schema.parse(body)),
  });
  const payload = superjson.parse<OutputType & {error?:string}>(await response.text());
  if (!response.ok) throw new Error(payload.error ?? "Unable to save change");
  return payload;
};