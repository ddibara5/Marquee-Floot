import { z } from "zod";

// A page crash on a signed-in device, sent once so it shows in the server log (October 17: blank screens in the iPhone app).
export const schema = z.object({
  message: z.string().max(500),
  stack: z.string().max(2000).optional(),
  componentStack: z.string().max(2000).optional(),
  path: z.string().max(200),
  platform: z.string().max(20),
});

export type InputType = z.infer<typeof schema>;

/** Fire and forget: reporting must never cause a second error. */
export function reportClientError(input: InputType) {
  const clip = (value: string | undefined, max: number) => value?.slice(0, max);
  const body = { ...input, message: clip(input.message, 500)!, stack: clip(input.stack, 2000), componentStack: clip(input.componentStack, 2000), path: clip(input.path, 200)!, platform: clip(input.platform, 20)! };
  try {
    void fetch("/_api/client-error", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  } catch {}
}
