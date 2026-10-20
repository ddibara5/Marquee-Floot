import superjson from "superjson";
import { callApp, AppCallError } from "@floot/apps";
import { marqueeWriter } from "../../helpers/marqueeWriter";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { NotAuthenticatedError } from "../../helpers/getSetServerSession";
import { schema } from "./send_POST.schema";

const json = (body: unknown, status = 200) =>
  new Response(superjson.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function callErrorMessage(code: string) {
  if (code === "not_connected" || code === "not_granted" || code === "revoked") return "Feedback is not connected to Constellation yet.";
  if (code === "not_published" || code === "function_missing") return "Constellation needs to be published first.";
  if (code === "timeout" || code === "rate_limited") return "Constellation did not answer. Try again in a minute.";
  return "Could not save feedback.";
}

async function handleRequest(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    // Dave is user 1, the same owner check the other Dave-only endpoints use.
    if (user.id !== 1) return json({ error: "Forbidden" }, 403);
    const parsed = schema.safeParse(superjson.parse(await request.text()));
    if (!parsed.success) return json({ error: "Write a little more, up to 2000 characters." }, 400);
    const { finding, type, context } = parsed.data;
    try {
      const result = await callApp<{ id: string }>("constellation", "logFeedback", { finding, type, context });
      return json({ id: result.id });
    } catch (error) {
      if (error instanceof AppCallError) {
        console.error("Feedback call failed:", error.code);
        return json({ error: callErrorMessage(error.code) }, 502);
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof NotAuthenticatedError) return json({ error: "Not authenticated" }, 401);
    console.error("Feedback failed:", error);
    return json({ error: "Could not save feedback." }, 500);
  }
}

export const handle = marqueeWriter.endpoint(handleRequest, "feedback/send_POST.ts", true);
