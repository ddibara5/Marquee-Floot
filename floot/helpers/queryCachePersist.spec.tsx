import { QueryClient, dehydrate } from "@tanstack/react-query";
import superjson from "superjson";
import { QUERY_CACHE_KEY, restoreQueryCache, shouldPersist, forgetQueryCache } from "./queryCachePersist";

describe("saved query cache", () => {
  afterEach(() => localStorage.clear());

  it("keeps only successful Marquee data, never the session", () => {
    const ok = { status: "success" } as any;
    expect(shouldPersist({ queryKey: ["marquee", "titles"], state: ok })).toBe(true);
    expect(shouldPersist({ queryKey: ["auth", "session"], state: ok })).toBe(false);
    expect(shouldPersist({ queryKey: ["marquee", "titles"], state: { status: "error" } as any })).toBe(false);
  });

  it("restores saved data with dates, ignores a corrupt save and forgets on sign-out", () => {
    const syncedAt = new Date("2026-10-16T05:16:00Z");
    const first = new QueryClient();
    first.setQueryData(["marquee", "trakt-status"], { connected: true, lastSyncAt: syncedAt });
    localStorage.setItem(QUERY_CACHE_KEY, superjson.stringify(dehydrate(first)));
    const next = new QueryClient();
    restoreQueryCache(next);
    const restored = next.getQueryData<{ lastSyncAt: Date }>(["marquee", "trakt-status"]);
    expect(restored?.lastSyncAt instanceof Date).toBe(true);
    expect(restored?.lastSyncAt.getTime()).toBe(syncedAt.getTime());
    localStorage.setItem(QUERY_CACHE_KEY, "{broken");
    restoreQueryCache(new QueryClient());
    expect(localStorage.getItem(QUERY_CACHE_KEY)).toBeNull();
    localStorage.setItem(QUERY_CACHE_KEY, "{}");
    forgetQueryCache();
    expect(localStorage.getItem(QUERY_CACHE_KEY)).toBeNull();
  });
});
