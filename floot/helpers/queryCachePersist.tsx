import { dehydrate, hydrate, type QueryClient, type Query } from "@tanstack/react-query";
import superjson from "superjson";

// Last-known data on this device, so screens open at once and refresh quietly (ported from GameDeck, October 17).
// superjson keeps Dates intact; only Marquee data is saved (never the auth session). Cleared on sign-out.
export const QUERY_CACHE_KEY = "marquee-query-cache-v1";
const MAX_CHARS = 2_000_000;

export const shouldPersist = (query: Pick<Query, "queryKey" | "state">) =>
  query.queryKey[0] === "marquee" && query.state.status === "success";

export function restoreQueryCache(client: QueryClient) {
  try {
    const saved = localStorage.getItem(QUERY_CACHE_KEY);
    if (saved) hydrate(client, superjson.parse(saved));
  } catch {
    forgetQueryCache();
  }
}

export function persistQueryCache(client: QueryClient) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const save = () => {
    timer = undefined;
    try {
      const text = superjson.stringify(dehydrate(client, { shouldDehydrateQuery: shouldPersist }));
      if (text.length <= MAX_CHARS) localStorage.setItem(QUERY_CACHE_KEY, text);
      else forgetQueryCache();
    } catch {}
  };
  const unsubscribe = client.getQueryCache().subscribe(event => {
    if (event.type === "updated" && event.action.type === "success" && !timer) timer = setTimeout(save, 2000);
  });
  return () => { unsubscribe(); if (timer) clearTimeout(timer); };
}

export function forgetQueryCache() {
  try { localStorage.removeItem(QUERY_CACHE_KEY); } catch {}
}
