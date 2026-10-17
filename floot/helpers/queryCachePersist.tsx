import { dehydrate, hydrate, type QueryClient, type Query } from "@tanstack/react-query";
import superjson from "superjson";
import type { User } from "./User";

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

// The last signed-in user on this device. The app opens signed in with it and checks the session in the background,
// like GameDeck (October 17); only the server saying "not signed in" signs out. Forgotten on sign-out.
const REMEMBERED_USER_KEY = "marquee-last-user";

export function readRememberedUser(): User | undefined {
  try {
    const user = JSON.parse(localStorage.getItem(REMEMBERED_USER_KEY) ?? "null");
    return user && typeof user.id === "number" && typeof user.email === "string" && typeof user.role === "string" ? user : undefined;
  } catch {
    return undefined;
  }
}

export function rememberUser(user: User | null) {
  try {
    if (user) localStorage.setItem(REMEMBERED_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(REMEMBERED_USER_KEY);
  } catch {}
}
