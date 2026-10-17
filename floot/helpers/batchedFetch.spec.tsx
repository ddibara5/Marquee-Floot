import { batchedFetch } from "./batchedFetch";
import { createBatchHandler } from "../endpoints/batch_GET";

const settle = () => new Promise(resolve => setTimeout(resolve, 40));

describe("batchedFetch (client)", () => {
  it("sends reads made in the same moment as one request and hands each caller its own response", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").and.callFake(async () => Response.json({ results: [
      { status: 200, body: '{"json":{"titles":[]}}' }, { status: 401, body: '{"json":{"error":"Not authenticated"}}' } ] }));
    const [titles, status] = await Promise.all([batchedFetch("/_api/titles"), batchedFetch("/_api/trakt-status")]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.calls.mostRecent().args[0])).toBe("/_api/batch?paths=" + encodeURIComponent("/_api/titles,/_api/trakt-status"));
    expect(titles.status).toBe(200);
    expect(await titles.text()).toBe('{"json":{"titles":[]}}');
    expect(status.status).toBe(401);
    expect(status.ok).toBeFalse();
  });

  it("sends a lone read directly, and anything that is not a plain GET is never batched", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").and.resolveTo(new Response("{}"));
    await batchedFetch("/_api/titles");
    await batchedFetch("/_api/personal-state", { method: "POST", body: "{}" });
    expect(fetchSpy.calls.allArgs().map(args => String(args[0]))).toEqual(["/_api/titles", "/_api/personal-state"]);
  });

  it("falls back to normal requests if the batch fails", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").and.callFake(async (input: RequestInfo | URL) =>
      String(input).startsWith("/_api/batch") ? new Response("down", { status: 502 }) : new Response(String(input)));
    const [a, b] = await Promise.all([batchedFetch("/_api/titles"), batchedFetch("/_api/dub-status")]);
    expect(await a.text()).toBe("/_api/titles");
    expect(await b.text()).toBe("/_api/dub-status");
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    await settle();
  });
});

describe("batch_GET (server)", () => {
  const reads = {
    "/_api/titles": async (request: Request) => new Response("titles " + request.headers.get("cookie"), { headers: { "Set-Cookie": "session=renewed" } }),
    "/_api/watch-history": async (request: Request) => new Response("history " + new URL(request.url).search, { status: 200 }),
  };
  const handle = createBatchHandler(reads);

  it("runs each allowed read with the caller's cookie, keeps order and query strings, and renews the session cookie", async () => {
    const paths = ["/_api/watch-history?page=0&filter=all", "/_api/titles"].join(",");
    const response = await handle(new Request("https://marquee.test/_api/batch?paths=" + encodeURIComponent(paths), { headers: { cookie: "session=abc" } }));
    expect(response.status).toBe(200);
    const { results } = await response.json();
    expect(results).toEqual([{ status: 200, body: "history ?page=0&filter=all" }, { status: 200, body: "titles session=abc" }]);
    expect(response.headers.get("set-cookie")).toBe("session=renewed");
  });

  it("refuses anything outside the read allowlist", async () => {
    const response = await handle(new Request("https://marquee.test/_api/batch?paths=" + encodeURIComponent("/_api/titles,/_api/personal-state")));
    expect(response.status).toBe(400);
  });
});
