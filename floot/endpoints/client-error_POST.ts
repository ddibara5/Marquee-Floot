import { marqueeWriter } from "../helpers/marqueeWriter";
import { getServerUserSession } from "../helpers/getServerUserSession";
import { schema } from "./client-error_POST.schema";

// Writes the report to the server log only (no database), for signed-in users, so crashes on a phone can be read.
async function handleRequest(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const report = schema.parse(await request.json());
    console.error("Marquee client crash", JSON.stringify({ userId: user.id, ...report }));
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 400 });
  }
}

export const handle = marqueeWriter.endpoint(handleRequest, "client-error_POST.ts", true);
