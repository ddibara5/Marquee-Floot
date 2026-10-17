import { handle as titles } from "./titles_GET";
import { handle as homeContext } from "./home-context_GET";
import { handle as personalState } from "./personal-state_GET";
import { handle as dubStatus } from "./dub-status_GET";
import { handle as traktStatus } from "./trakt-status_GET";
import { handle as crunchyrollStatus } from "./crunchyroll-status_GET";
import { handle as watchHistory } from "./watch-history_GET";
import { handle as insightsContext } from "./insights-context_GET";
import { handle as titleEpisodes } from "./title-episodes_GET";

type Read = (request: Request) => Promise<Response>;
const MAX_BATCH = 9;

/** Runs several read endpoints in one request (helpers/batchedFetch.tsx). Each read gets the caller's own headers, so
 *  it checks the session itself exactly as when called directly; only the reads below are allowed. Read-only. */
export function createBatchHandler(reads: Record<string, Read>) {
  return async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const paths = (url.searchParams.get("paths") ?? "").split(",").filter(Boolean);
    const routes = paths.map(path => new URL(path, url.origin));
    if (!paths.length || paths.length > MAX_BATCH || routes.some(route => route.origin !== url.origin || !Object.hasOwn(reads, route.pathname)))
      return Response.json({ error: "Unsupported batch" }, { status: 400 });
    let cookie: string | null = null;
    const results = await Promise.all(routes.map(async route => {
      try {
        const response = await reads[route.pathname](new Request(route, { method: "GET", headers: request.headers }));
        cookie ??= response.headers.get("set-cookie");
        return { status: response.status, body: await response.text() };
      } catch {
        return { status: 500, body: JSON.stringify({ json: { error: "Unable to load" } }) };
      }
    }));
    const response = Response.json({ results });
    if (cookie) response.headers.set("Set-Cookie", cookie); // the session renewal every read sends; one is enough
    return response;
  };
}

export const handle = createBatchHandler({
  "/_api/titles": titles, "/_api/home-context": homeContext, "/_api/personal-state": personalState,
  "/_api/dub-status": dubStatus, "/_api/trakt-status": traktStatus, "/_api/crunchyroll-status": crunchyrollStatus,
  "/_api/watch-history": watchHistory, "/_api/insights-context": insightsContext, "/_api/title-episodes": titleEpisodes,
});
