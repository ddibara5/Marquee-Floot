import { z } from "zod";
import superjson from "superjson";

// Send feedback (October 20): Dave only, saved to App Feedback in his vault through Constellation.
export const schema = z.object({
  finding: z.string().trim().min(1).max(2000),
  type: z.enum(["Bug", "Enhancement", "Unclear"]).optional(),
  context: z.string().trim().max(1000).optional(),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { id: string };

export const postFeedback = async (body: z.input<typeof schema>): Promise<OutputType> => {
  const response = await fetch("/_api/feedback/send", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: superjson.stringify(schema.parse(body)),
  });
  const payload = superjson.parse<OutputType & { error?: string }>(await response.text());
  if (!response.ok) throw new Error(payload.error ?? "Could not save feedback.");
  return payload;
};
