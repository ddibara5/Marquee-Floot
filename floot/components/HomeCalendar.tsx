import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, agendaFrom, calendarMonthRange, monthCells, type CalendarItem } from "../helpers/homeCalendar";
import type { WeekDay } from "../endpoints/home-context_GET.schema";
import styles from "./HomeCalendar.module.css";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const fmt = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Date(day + "T00:00:00Z").toLocaleDateString(undefined, { timeZone: "UTC", ...options });
const dayDiff = (from: string, to: string) => Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86400000);
const plural = (n: number, word: string) => n + " " + word + (n === 1 ? "" : "s");

/** Desktop Home tile (October 23, 2026): a month of release days and watched days, with the next few items. */
export function HomeCalendar({ items, watched, today, days = 60, className }: {
  items: CalendarItem[]; watched: Map<string, WeekDay>; today: string; days?: number; className?: string;
}) {
  const months = calendarMonthRange(today, addDays(today, days));
  const [monthIndex, setMonthIndex] = useState(0);
  const [selected, setSelected] = useState(today);
  const index = Math.min(monthIndex, months.length - 1);
  const month = months[index];
  const releases = new Map<string, number>();
  items.forEach(item => releases.set(item.day, (releases.get(item.day) ?? 0) + 1));
  const watchCount = (day: string) => { const counts = watched.get(day); return counts ? counts.episodes + counts.movies : 0; };
  const seen = watched.get(selected);
  const seenParts = seen ? [seen.episodes ? plural(seen.episodes, "episode") : "", seen.movies ? plural(seen.movies, "movie") : ""].filter(Boolean) : [];
  const on = selected === today ? " today" : " on " + fmt(selected, { month: "short", day: "numeric" });
  const note = seenParts.length ? "Watched " + seenParts.join(" and ") + on : selected < today ? "Nothing watched" + on : "";
  const agenda = agendaFrom(items, selected, today, note ? 3 : 4);
  const head = selected === today ? "Next up" : selected < today ? "Next up after today" : "From " + fmt(selected, { weekday: "short", month: "short", day: "numeric" });
  const monthLabel = fmt(month + "-01", { month: "long", year: "numeric" });

  return <section className={styles.tile + (className ? " " + className : "")} aria-labelledby="home-calendar">
    <div className={styles.header}>
      <h2 id="home-calendar">Calendar</h2>
      {(index !== 0 || selected !== today) && <button type="button" className={styles.today} onClick={() => { setMonthIndex(0); setSelected(today); }}>Today</button>}
      <button type="button" className={styles.arrow} aria-label="Previous month" disabled={index === 0} onClick={() => setMonthIndex(index - 1)}><ChevronLeft size={16} aria-hidden="true" /></button>
      <span className={styles.month} aria-live="polite">{monthLabel}</span>
      <button type="button" className={styles.arrow} aria-label="Next month" disabled={index === months.length - 1} onClick={() => setMonthIndex(index + 1)}><ChevronRight size={16} aria-hidden="true" /></button>
    </div>
    <div className={styles.body}>
      <div className={styles.grid} role="group" aria-label={monthLabel}>
        {WEEKDAYS.map(name => <abbr key={name} title={name} className={styles.weekday}>{name[0]}</abbr>)}
        {monthCells(month).map((day, cell) => {
          if (!day) return <span key={cell} aria-hidden="true" />;
          const due = releases.get(day) ?? 0, count = watchCount(day);
          const label = fmt(day, { weekday: "long", month: "long", day: "numeric" }) + (day === today ? ", today" : "")
            + (due ? ", " + plural(due, "release") : "") + (count ? ", watched " + count : "");
          return <button type="button" key={day} className={styles.day} aria-label={label} aria-pressed={day === selected}
            data-past={day < today || undefined} data-today={day === today || undefined} onClick={() => setSelected(day)}>
            {Number(day.slice(8))}<span className={styles.mark} data-kind={due ? "release" : count ? "watched" : undefined} aria-hidden="true" />
          </button>;
        })}
      </div>
      <div className={styles.agenda}>
        <p className={styles.agendaHead}>{head}</p>
        {note && <p className={styles.note}>{note}</p>}
        {agenda.map(item => { const n = dayDiff(today, item.day);
          return <Link className={styles.item} to={item.to} key={item.key}>
            <span className={styles.chip} aria-hidden="true"><small>{fmt(item.day, { weekday: "short" })}</small><strong>{Number(item.day.slice(8))}</strong></span>
            <span className={styles.copy}><strong>{item.name}</strong>
              <small><span className={styles.visuallyHidden}>{fmt(item.day, { month: "long", day: "numeric" })}, </span>{item.detail} · {n === 0 ? "Today" : n === 1 ? "Tomorrow" : "In " + n + " days"}</small></span>
          </Link>; })}
        {!agenda.length && <p className={styles.empty}>{items.length ? "Nothing dated after this." : "Nothing dated in the next " + days + " days."}</p>}
      </div>
    </div>
  </section>;
}
