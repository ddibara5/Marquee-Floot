import type { HistoryEvent } from "../endpoints/watch-history_GET.schema";

/** One title's watches inside a period, newest first. */
export type ActivityGroup = { key: string; titleId: number; title: string; posterPath: string | null; kind: HistoryEvent["kind"]; events: HistoryEvent[] };
export type ActivityPeriod = { key: string; label: string; count: number; groups: ActivityGroup[] };

const DAY = 24 * 60 * 60 * 1000;
const startOfWeek = (date: Date) => { // Monday, local time
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
};

/** Activity grouped by This week, Last week, then calendar month; each title once per period (October 17, Batch C). */
export function groupActivity(events: HistoryEvent[], now: Date): ActivityPeriod[] {
  const thisWeek = startOfWeek(now).getTime();
  const lastWeek = thisWeek - 7 * DAY;
  const periods = new Map<string, ActivityPeriod>();
  for (const event of events) {
    const date = new Date(event.watchedAt);
    const time = date.getTime();
    if (!Number.isFinite(time)) continue;
    const [key, label] = time >= thisWeek ? ["this-week", "This week"]
      : time >= lastWeek ? ["last-week", "Last week"]
      : [`${date.getFullYear()}-${date.getMonth() + 1}`,
        date.toLocaleDateString(undefined, date.getFullYear() === now.getFullYear() ? { month: "long" } : { month: "long", year: "numeric" })];
    let period = periods.get(key);
    if (!period) periods.set(key, period = { key, label, count: 0, groups: [] });
    period.count += 1;
    let group = period.groups.find(g => g.titleId === event.titleId && g.kind === event.kind);
    if (!group) period.groups.push(group = { key: `${key}-${event.kind}-${event.titleId}`, titleId: event.titleId, title: event.title, posterPath: event.posterPath, kind: event.kind, events: [] });
    group.events.push(event);
  }
  return [...periods.values()];
}

const day = (date: Date) => date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const dayRange = (first: Date, last: Date) => {
  if (day(first) === day(last)) return day(first);
  return first.getMonth() === last.getMonth() ? `${day(first)} to ${last.getDate()}` : `${day(first)} to ${day(last)}`;
};
const episode = (event: HistoryEvent, season?: number | null) =>
  event.seasonNumber === null || event.episodeNumber === null ? null
    : season === event.seasonNumber ? `E${event.episodeNumber}` : `S${event.seasonNumber} E${event.episodeNumber}`;

/** One line under a group's title: what was watched and when. */
export function describeGroup(group: ActivityGroup): string {
  const newest = group.events[0], oldest = group.events[group.events.length - 1];
  const when = dayRange(new Date(oldest.watchedAt), new Date(newest.watchedAt));
  if (group.kind === "movie") return group.events.length > 1 ? `Watched ${group.events.length} times · ${when}` : `Movie watched · ${when}`;
  if (group.events.length === 1) return [episode(newest), newest.episodeTitle, when].filter(Boolean).join(" · ");
  const from = episode(oldest), to = episode(newest, oldest.seasonNumber);
  return [`${group.events.length} episodes`, from && to ? `${from} to ${to}` : null, when].filter(Boolean).join(" · ");
}
