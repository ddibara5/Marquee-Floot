import { useState } from "react";

/** Home sections after Up next, which always stays first. Saved per device, like the theme. */
export const HOME_SECTIONS = [
  { id: "keep", label: "Keep watching", hint: "Shows you have started" },
  { id: "upcoming", label: "Coming up", hint: "New episodes and release dates" },
  { id: "recent", label: "Recent activity", hint: "Lately, without Up next" },
  { id: "watchlist", label: "On your Watch List", hint: "Posters from your list" },
] as const;
export type HomeSectionId = typeof HOME_SECTIONS[number]["id"];
export type HomeLayout = { order: HomeSectionId[]; hidden: HomeSectionId[] };

const STORAGE_KEY = "marquee-home-layout";
const ids = HOME_SECTIONS.map(section => section.id) as HomeSectionId[];
export const defaultHomeLayout = (): HomeLayout => ({ order: [...ids], hidden: [] });

/** Keeps known ids only, once each, and appends sections added after the layout was saved. */
export function normalizeHomeLayout(value: unknown): HomeLayout {
  const raw = (value && typeof value === "object" ? value : {}) as Partial<Record<keyof HomeLayout, unknown>>;
  const known = (list: unknown) => Array.isArray(list) ? list.filter((id): id is HomeSectionId => ids.includes(id)) : [];
  const order = [...new Set(known(raw.order))];
  return { order: [...order, ...ids.filter(id => !order.includes(id))], hidden: [...new Set(known(raw.hidden))] };
}

export function moveHomeSection(layout: HomeLayout, id: HomeSectionId, step: -1 | 1): HomeLayout {
  const order = [...layout.order];
  const from = order.indexOf(id);
  const to = from + step;
  if (from < 0 || to < 0 || to >= order.length) return layout;
  [order[from], order[to]] = [order[to], order[from]];
  return { ...layout, order };
}

function read(): HomeLayout {
  try { return normalizeHomeLayout(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")); }
  catch { return defaultHomeLayout(); }
}

export function useHomeLayout() {
  const [layout, setLayout] = useState<HomeLayout>(read);
  const save = (next: HomeLayout) => {
    setLayout(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* private mode: keep in memory */ }
  };
  return { layout, save, reset: () => save(defaultHomeLayout()) };
}
