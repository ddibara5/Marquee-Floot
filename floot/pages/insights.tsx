import {useSavedControl} from "../helpers/useSavedControl";
import {calendarMonths} from "../helpers/calendarPeriod";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ChevronRight, Star } from "lucide-react";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { MediaImage } from "../components/MediaImage";
import { StateBlock } from "../components/StateBlock";
import { TmdbLogo } from "../components/TmdbLogo";
import { insightsContextQuery } from "../helpers/warmAppData";
import { buildLibraryInsights } from "../helpers/buildLibraryInsights";
import { tmdbImageUrl } from "../helpers/tmdbImageUrl";
import type { Title } from "../helpers/Title";
import { useTitles } from "../helpers/useTitles";
import styles from "./insights.module.css";

/** 44px poster used by every title row on this page (October 22 design pass: one title-row shape). */
function RowPoster({ title, name }: { title?: Title; name: string }) {
  const url = tmdbImageUrl(title?.posterPath, "w185");
  return <span className={styles.poster} aria-hidden="true"><MediaImage key={url ?? name} src={url} fallback={name.slice(0, 1)} alt="" loading="lazy" decoding="async" /></span>;
}

export default function InsightsPage() {
  const [period, setPeriod] = useSavedControl<"3"|"12"|"all">("marquee-insights-period","12",["3","12","all"]);
  const { data: titles = [], isFetching, error, refetch } = useTitles();
  const context = useQuery(insightsContextQuery);
  const ratings = new Map(context.data?.ratings.map(row => [String(row.titleId), row.score]));
  const manualStatuses = new Map(context.data?.statuses.map(row => [String(row.titleId), row.status]));
  const insights = buildLibraryInsights(titles.map(title => ({
    ...title, score: ratings.get(title.id) ?? title.score,
  })), new Date(), manualStatuses);
  const byMonth = new Map((context.data?.monthly ?? []).map(row=>[row.month,row]));
  const months = calendarMonths([...byMonth.keys()],period).map(month=>byMonth.get(month)??{month,episodes:0,movies:0});
  const maxWatches = Math.max(1, ...months.map(month => month.episodes + month.movies));
  const periodWatches = months.reduce((sum, month) => sum + month.episodes + month.movies, 0);
  // Jet Money's period comparison (October 23): the same number of months just before this period.
  const span = period === "all" ? 0 : Number(period);
  const priorWatches = months.reduce((sum, month) => {
    const [year, mon] = month.month.split("-").map(Number), n = year * 12 + mon - 1 - span;
    const row = byMonth.get(Math.floor(n / 12) + "-" + String(n % 12 + 1).padStart(2, "0"));
    return sum + (row ? row.episodes + row.movies : 0);
  }, 0);
  const change = span && priorWatches > 0 ? Math.round((periodWatches - priorWatches) / priorWatches * 100) : null;
  const [picked, setPicked] = useState<string | null>(null);
  // Long periods scroll sideways: open on the latest month, not the oldest.
  const monthsRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = monthsRef.current; if (el) el.scrollLeft = el.scrollWidth; }, [period, months.length]);
  const selected = months.find(month => month.month === picked) ?? months[months.length - 1];
  const monthName = (month: string, options: Intl.DateTimeFormatOptions) => new Date(month + "-01T12:00:00").toLocaleDateString(undefined, options);
  const byId = new Map(titles.map(title => [title.id, title]));

  // Wait for your ratings and dated watches too, so no number changes after the page draws.
  if ((isFetching && titles.length === 0) || context.isPending) {
    return (
      <div className={styles.loading} aria-busy="true">
        <Skeleton className={styles.periodSkeleton} />
        <Skeleton style={{ height: 340, borderRadius: "var(--radius-tile)" }} />
        <Skeleton style={{ height: 220 }} />
      </div>
    );
  }

  if (error && !titles.length) {
    return <StateBlock kind="error" title="Insights didn't load" onRetry={() => void refetch()}>Your library could not be read. Try again.</StateBlock>;
  }

  const watchSegments = [
    { label: "Complete", value: insights.completed, className: styles.completeSegment },
    { label: "In progress", value: insights.inProgress, className: styles.progressSegment },
    { label: "Paused", value: insights.paused, className: styles.pausedSegment },
    { label: "Dropped", value: insights.dropped, className: styles.droppedSegment },
    { label: "Unwatched", value: insights.unwatched, className: styles.unwatchedSegment },
  ].filter(segment => segment.value > 0);

  const mediaMix = [
    { label: "Series", value: insights.shows, className: styles.mixShows },
    { label: "Movies", value: insights.movies, className: styles.mixMovies },
    { label: "Anime", value: insights.anime, className: styles.mixAnime },
  ];
  const mixTotal = mediaMix.reduce((sum, row) => sum + row.value, 0);
  const mostMax = Math.max(1, ...(context.data?.mostWatched ?? []).map(row => row.watches));
  // GameDeck's prompt (October 23): titles watched in the last 30 days that still have no rating.
  const needRating = titles.filter(title => title.lastWatched && Date.now() - new Date(title.lastWatched).getTime() <= 30 * 86400000
    && (ratings.get(title.id) ?? title.score) == null)
    .sort((a, b) => (b.lastWatched ?? "").localeCompare(a.lastWatched ?? ""));

  return (
    <>
      <Helmet><title>Insights · Marquee</title></Helmet>
      {error && <p role="alert" className={styles.error}>Couldn’t refresh insights. Showing saved data. <Button variant="ghost" onClick={() => void refetch()}>Retry</Button></p>}
      {context.error && <StateBlock kind="error" title="Viewing trends didn't load" onRetry={() => void context.refetch()}>Collection insights below are still current.</StateBlock>}

      <div className={styles.insightsGrid}>
      <div className={styles.periodBar}>
        <div className={styles.periods} role="group" aria-label="Viewing period">
          {(["3", "12", "all"] as const).map(value => <button type="button" key={value} aria-pressed={period === value}
            onClick={() => { setPeriod(value); setPicked(null); }}>{value === "all" ? "All time" : value === "3" ? "3 months" : "12 months"}</button>)}
        </div>
      </div>

      {/* October 22 design pass: one hero tile per page. The period's headline number leads, the month bars sit under it. */}
      <section className={styles.hero} aria-labelledby="insights-headline">
        <div className={styles.headline}>
          <strong id="insights-headline">{periodWatches}</strong>
          <span>{periodWatches === 1 ? "watch" : "watches"}{months.length > 0 && <> from {monthName(months[0].month, { month: "short", year: "numeric" })} to {monthName(months[months.length - 1].month, { month: "short", year: "numeric" })}</>}</span>
          {change !== null && <span className={styles.change}>{change > 0 ? "↑" : change < 0 ? "↓" : ""} {Math.abs(change)}% vs the previous {span} months</span>}
        </div>
        <dl className={styles.stats}>
          <div><dt>Completed</dt><dd>{insights.completed}</dd></div>
          <div><dt>Avg rating</dt><dd>{insights.averageRating ?? <span className={styles.none}>No ratings</span>}</dd></div>
        </dl>
        {selected
          ? <>
            <div ref={monthsRef} className={styles.months} role="group" aria-label="Watches per month">{months.map(month => {
              const total = month.episodes + month.movies;
              const label = months.length <= 12 ? monthName(month.month, { month: "narrow" })
                : month.month.endsWith("-01") ? monthName(month.month, { year: "2-digit" }) : "";
              return <button type="button" key={month.month} className={styles.bar} aria-pressed={month.month === selected.month}
                aria-label={`${monthName(month.month, { month: "long", year: "numeric" })}: ${total} ${total === 1 ? "watch" : "watches"}`}
                onClick={() => setPicked(month.month)}>
                <span className={styles.barTrack} aria-hidden="true">
                  <b style={{ height: (month.movies / maxWatches * 100) + "%" }}/><i style={{ height: (month.episodes / maxWatches * 100) + "%" }}/>
                </span>
                <span aria-hidden="true">{label}</span>
              </button>;
            })}</div>
            <div className={styles.barDetail} aria-live="polite">
              <span><strong>{monthName(selected.month, { month: "short", year: "numeric" })}</strong> · {selected.episodes} {selected.episodes === 1 ? "episode" : "episodes"}, {selected.movies} {selected.movies === 1 ? "movie" : "movies"}</span>
              <Link to="/library?view=history">Activity <ChevronRight size={14} aria-hidden="true"/></Link>
            </div>
            <p className={styles.trendNote}><i/>Episodes <b/>Movies</p>
          </>
          : <p className={styles.empty}>No dated watches in this period.</p>}
      </section>

      {context.data && context.data.mostWatched.length > 0 && <section className={styles.section} aria-labelledby="insights-most">
        <div className={styles.sectionHeading}><h2 id="insights-most">Most watched</h2><span>Last 30 days</span></div>
        <div className={styles.rows}>{context.data.mostWatched.map(row => {
          const title = byId.get(String(row.titleId));
          const unit = title?.type === "movie" ? (row.watches === 1 ? "watch" : "watches") : (row.watches === 1 ? "episode" : "episodes");
          return <Link className={styles.row} key={row.titleId} to={"/titles/" + row.titleId} aria-label={`${row.title}, ${row.watches} ${unit}`}>
            <RowPoster title={title} name={row.title} />
            <span className={styles.rowCopy}><strong>{row.title}</strong><span className={styles.meter}><span style={{ width: (row.watches / mostMax * 100) + "%" }} /></span></span>
            <strong className={styles.rowValue}>{row.watches}</strong>
          </Link>;
        })}</div>
      </section>}

      <section className={styles.section} aria-labelledby="insights-status">
        <div className={styles.sectionHeading}><h2 id="insights-status">Viewing status</h2><span>{insights.total} titles</span></div>
        <div className={styles.stackedBar} aria-hidden="true">
          {watchSegments.map((segment) => <span key={segment.label} className={segment.className}
            style={{ width: insights.total ? (segment.value / insights.total) * 100 + "%" : "0%" }} />)}
        </div>
        <dl className={styles.legend}>
          {watchSegments.map((segment) => <div key={segment.label}><i className={segment.className} /><dt>{segment.label}</dt><dd>{segment.value}</dd></div>)}
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="insights-series">
        <div className={styles.sectionHeading}><h2 id="insights-series">Series watched</h2><span>{insights.episodeProgressRate}%</span></div>
        <div className={styles.progressTrack}><span style={{ width: insights.episodeProgressRate + "%" }} /></div>
        <div className={styles.progressMeta}><span>{insights.watchedEpisodes} watched</span><span>{insights.releasedEpisodes} released</span></div>
      </section>

      <section className={styles.section} aria-labelledby="insights-mix">
        <div className={styles.sectionHeading}><h2 id="insights-mix">Your library</h2><span>{insights.total} titles</span></div>
        <div className={styles.stackedBar} aria-hidden="true">
          {mediaMix.map(row => <span key={row.label} className={row.className} style={{ width: mixTotal ? (row.value / mixTotal) * 100 + "%" : "0%" }} />)}
        </div>
        <dl className={styles.mix}>
          {mediaMix.map(row => <div key={row.label}><dt><i className={row.className} />{row.label}</dt><dd>{row.value}</dd></div>)}
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="insights-rated">
        <div className={styles.sectionHeading}><h2 id="insights-rated">Highest rated</h2><span>{insights.ratedCount} rated</span></div>
        {insights.topRated.length ? (
          <div className={styles.rows}>
            {insights.topRated.map(title => (
              <Link className={styles.row} key={title.id} to={"/titles/" + title.id}>
                <RowPoster title={byId.get(title.id)} name={title.title} />
                <span className={styles.rowCopy}><strong>{title.title}</strong><small>{title.year ?? "Year unknown"} · {title.anime ? "Anime" : title.type === "show" ? "Series" : "Movie"}</small></span>
                <span className={styles.score}><Star size={14} fill="currentColor" aria-hidden="true" />{title.score}</span>
              </Link>
            ))}
          </div>
        ) : <StateBlock kind="empty" title="No ratings yet">Rate a title from its details page.</StateBlock>}
        {needRating.length > 0 && <Link className={styles.ratePrompt} to={"/titles/" + needRating[0].id}>
          <span className={styles.rateStack} aria-hidden="true">{needRating.slice(0, 3).map(title => <RowPoster key={title.id} title={title} name={title.title} />)}</span>
          <span className={styles.rowCopy}><strong>{needRating.length} recent {needRating.length === 1 ? "title needs" : "titles need"} a rating</strong><small>Start with {needRating[0].title}</small></span>
          <ChevronRight size={18} aria-hidden="true" />
        </Link>}
      </section>

      <section className={styles.credits}>
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" aria-label="The Movie Database"><TmdbLogo /></a>
        <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </section>
      </div>
    </>
  );
}
