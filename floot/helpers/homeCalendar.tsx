/** Desktop Home calendar (October 23, 2026). Days are YYYY-MM-DD strings, months YYYY-MM; weeks start on Sunday. */
export type CalendarItem = { key: string; day: string; name: string; detail: string; to: string };

const asDate = (day: string) => new Date(day + "T00:00:00Z");
export const addDays = (day: string, n: number) => new Date(asDate(day).getTime() + n * 86400000).toISOString().slice(0, 10);

/** Every month from `first`'s month through `last`'s month. */
export function calendarMonthRange(first: string, last: string): string[] {
  const index = (day: string) => Number(day.slice(0, 4)) * 12 + Number(day.slice(5, 7)) - 1;
  return Array.from({ length: Math.max(1, index(last) - index(first) + 1) }, (_, i) => {
    const n = index(first) + i;
    return Math.floor(n / 12) + "-" + String(n % 12 + 1).padStart(2, "0");
  });
}

/** 42 cells (six weeks) so the grid keeps one height; null pads days outside the month. */
export function monthCells(month: string): (string | null)[] {
  const first = asDate(month + "-01");
  const lead = first.getUTCDay();
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({ length: 42 }, (_, i) => {
    const n = i - lead + 1;
    return n >= 1 && n <= count ? month + "-" + String(n).padStart(2, "0") : null;
  });
}

/** Items on or after the selected day (never before today), in date order. */
export function agendaFrom(items: CalendarItem[], selected: string, today: string, limit: number): CalendarItem[] {
  const start = selected < today ? today : selected;
  return items.filter(item => item.day >= start).sort((a, b) => a.day.localeCompare(b.day)).slice(0, limit);
}
