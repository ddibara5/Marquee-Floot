import {useSavedControl} from "../helpers/useSavedControl";
import {calendarMonths} from "../helpers/calendarPeriod";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Film,
  LibraryBig,
  PlayCircle,
  Star,
  Tv2,
} from "lucide-react";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { TmdbLogo } from "../components/TmdbLogo";
import { insightsContextQuery } from "../helpers/warmAppData";
import { buildLibraryInsights } from "../helpers/buildLibraryInsights";
import { useTitles } from "../helpers/useTitles";
import styles from "./insights.module.css";

export default function InsightsPage() {
  const [period, setPeriod] = useSavedControl<"3"|"12"|"all">("marquee-insights-period","12",["3","12","all"]);
  const { data: titles = [], isFetching, error } = useTitles();
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
  const [picked, setPicked] = useState<string | null>(null);
  const selected = months.find(month => month.month === picked) ?? months[months.length - 1];
  const monthName = (month: string, options: Intl.DateTimeFormatOptions) => new Date(month + "-01T12:00:00").toLocaleDateString(undefined, options);

  // Wait for your ratings and dated watches too, so no number changes after the page draws.
  if ((isFetching && titles.length === 0) || context.isPending) {
    return (
      <div className={styles.loading} aria-busy="true">
        <Skeleton className={styles.periodSkeleton} />
        <Skeleton style={{ height: 78 }} />
        <Skeleton style={{ height: 264 }} />
      </div>
    );
  }

  if (error && !titles.length) {
    return <p className={styles.error}>Unable to load insights.</p>;
  }

  const watchSegments = [
    { label: "Complete", value: insights.completed, className: styles.completeSegment },
    { label: "In progress", value: insights.inProgress, className: styles.progressSegment },
    { label: "Paused", value: insights.paused, className: styles.pausedSegment },
    { label: "Dropped", value: insights.dropped, className: styles.droppedSegment },
    { label: "Unwatched", value: insights.unwatched, className: styles.unwatchedSegment },
  ];

  const mediaMix = [
    { label: "Shows", value: insights.shows, icon: Tv2 },
    { label: "Movies", value: insights.movies, icon: Film },
    { label: "Anime", value: insights.anime, icon: PlayCircle },
  ];


  return (
    <>
      <Helmet><title>Insights · Marquee</title></Helmet>
      {error && <p role="alert" className={styles.error}>Couldn’t refresh insights. Showing saved data.</p>}
      {context.error && <p role="alert" className={styles.error}>Viewing trends could not load. Collection insights remain available. <Button variant="ghost" onClick={() => void context.refetch()}>Retry</Button></p>}

      <div className={styles.insightsGrid}>
      {/* Batch C (October 17): one period switch for the page, three headline numbers, then tappable month bars, like GameDeck's Insights. */}
      <div className={styles.periodBar}>
        <div className={styles.periods} role="group" aria-label="Viewing period">
          {(["3", "12", "all"] as const).map(value => <button type="button" key={value} aria-pressed={period === value}
            onClick={() => { setPeriod(value); setPicked(null); }}>{value === "all" ? "All" : value + " mo"}</button>)}
        </div>
        {months.length > 0 && <small>{monthName(months[0].month, { month: "short", year: "numeric" })} to {monthName(months[months.length - 1].month, { month: "short", year: "numeric" })}</small>}
      </div>

      <section className={styles.summary} aria-label="Summary">
        <div><strong>{periodWatches}</strong><span>dated watches</span></div>
        <div><strong>{insights.completionRate}%</strong><span>{insights.completed} complete</span></div>
        <div><strong>{insights.averageRating ?? "None"}</strong><span>avg rating</span></div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeading}><div><h2>Viewing over time</h2></div><span className={styles.ratedCount}>Watches per month</span></div>
        {selected
          ? <>
            <div className={styles.months} role="group" aria-label="Watches per month">{months.map(month => {
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
              <Link to="/library?view=history">View in Activity <ChevronRight size={14} aria-hidden="true"/></Link>
            </div>
          </>
          : <p className={styles.empty}>No dated watches in this period.</p>}
        <p className={styles.trendNote}>Episodes <i/> · Movies <b/>. Older imported dates may be less reliable; completions without a date are excluded.</p>
      </section>

      {context.data && <section className={styles.panel}>
        <div className={styles.panelHeading}><div><p>LAST 30 DAYS</p><h2>Recently watched</h2></div><span className={styles.ratedCount}>Last 30 days</span></div>
        <div className={styles.recentMetrics}><span><strong>{context.data.recentEpisodes}</strong> episode watches</span><span><strong>{context.data.recentMovies}</strong> movie watches</span></div>
        {context.data.mostWatched.length > 0 && <><h3 className={styles.subheading}>Most watched titles</h3>
          <div className={styles.rankedList}>{context.data.mostWatched.map(row =>
            <Link className={styles.rankRow + " " + styles.mostRow} key={row.titleId} to={"/titles/" + row.titleId}>
              <strong>{row.title}</strong><span>{row.watches} dated watches</span>
            </Link>)}</div></>}
      </section>}

      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div>
            <p>WATCH STATE</p>
            <h2>Viewing status</h2>
          </div>
          <strong>{insights.total}</strong>
        </div>

        <div className={styles.stackedBar} aria-label="Watch state distribution">
          {watchSegments.map((segment) => (
            <span
              key={segment.label}
              className={segment.className}
              style={{
                width: insights.total
                  ? (segment.value / insights.total) * 100 + "%"
                  : "0%",
              }}
            />
          ))}
        </div>

        <div className={styles.legend}>
          {watchSegments.map((segment) => (
            <div key={segment.label}>
              <i className={segment.className} />
              <span>{segment.label}</span>
              <strong>{segment.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div>
            <p>EPISODE PROGRESS</p>
            <h2>Series watched</h2>
          </div>
          <strong>{insights.episodeProgressRate}%</strong>
        </div>

        <div className={styles.progressTrack}>
          <span style={{ width: insights.episodeProgressRate + "%" }} />
        </div>

        <div className={styles.progressMeta}>
          <span>{insights.watchedEpisodes} watched</span>
          <span>{insights.releasedEpisodes} released</span>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div>
            <p>MEDIA MIX</p>
            <h2>Collection mix</h2>
          </div>
          <LibraryBig size={16} />
        </div>

        <div className={styles.mixList}>
          {mediaMix.map(({ label, value, icon: Icon }) => {
            const pct = insights.total ? Math.round((value / insights.total) * 100) : 0;
            return (
              <div className={styles.mixRow} key={label}>
                <div className={styles.mixLabel}>
                  <Icon size={14} />
                  <span>{label}</span>
                </div>
                <div className={styles.mixTrack}><span style={{ width: pct + "%" }} /></div>
                <strong>{value}</strong>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div>
            <p>RATINGS</p>
            <h2>Highest rated</h2>
          </div>
          <span className={styles.ratedCount}>{insights.ratedCount} rated</span>
        </div>

        {insights.topRated.length ? (
          <div className={styles.rankedList}>
            {insights.topRated.map((title, index) => (
              <Link className={styles.rankRow} key={title.id} to={"/titles/" + title.id}>
                <span className={styles.rankNumber}>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{title.title}</strong>
                  <span>{title.year ?? "—"} · {title.anime ? "Anime" : title.type === "show" ? "Series" : "Movie"}</span>
                </div>
                <span className={styles.score}><Star size={12} fill="currentColor" />{title.score}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>No ratings yet.</p>
        )}
      </section>


      <section className={styles.credits}>
        <a
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noreferrer"
          aria-label="The Movie Database"
        >
          <TmdbLogo />
        </a>
        <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </section>
      </div>
    </>
  );
}

