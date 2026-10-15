import {useSavedControl} from "../helpers/useSavedControl";
import {calendarMonths} from "../helpers/calendarPeriod";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import {
  Activity,
  CheckCircle2,
  CircleDot,
  Film,
  LibraryBig,
  PlayCircle,
  Star,
  Tv2,
} from "lucide-react";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { getInsightsContext } from "../endpoints/insights-context_GET.schema";
import { buildLibraryInsights } from "../helpers/buildLibraryInsights";
import { useTitles } from "../helpers/useTitles";
import styles from "./insights.module.css";

export default function InsightsPage() {
  const [period, setPeriod] = useSavedControl<"3"|"12"|"all">("marquee-insights-period","12",["3","12","all"]);
  const { data: titles = [], isFetching, error } = useTitles();
  const context = useQuery({ queryKey: ["marquee", "insights-context"], queryFn: getInsightsContext, staleTime: 60_000, retry: false });
  const ratings = new Map(context.data?.ratings.map(row => [String(row.titleId), row.score]));
  const manualStatuses = new Map(context.data?.statuses.map(row => [String(row.titleId), row.status]));
  const insights = buildLibraryInsights(titles.map(title => ({
    ...title, score: ratings.get(title.id) ?? title.score,
  })), new Date(), manualStatuses);
  const byMonth = new Map((context.data?.monthly ?? []).map(row=>[row.month,row]));
  const months = calendarMonths([...byMonth.keys()],period).map(month=>byMonth.get(month)??{month,episodes:0,movies:0});
  const maxWatches = Math.max(1, ...months.map(month => month.episodes + month.movies));

  if (isFetching && titles.length === 0) {
    return (
      <div className={styles.loading}>
        <Skeleton style={{ height: 88 }} />
        <Skeleton style={{ height: 180 }} />
        <Skeleton style={{ height: 180 }} />
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
      <section className={styles.metricGrid}>
        <article className={styles.heroMetric}>
          <div className={styles.metricIcon}><CheckCircle2 size={17} /></div>
          <div>
            <p>Completion</p>
            <strong>{insights.completionRate}%</strong>
          </div>
          <span>{insights.completed} complete</span>
        </article>

        <article className={styles.metric}>
          <CircleDot size={15} />
          <div>
            <span>In progress</span>
            <strong>{insights.inProgress}</strong>
          </div>
        </article>

        <article className={styles.metric}>
          <Activity size={15} />
          <div>
            <span>Titles, 30 days</span>
            <strong>{insights.recentCount}</strong>
          </div>
        </article>

        <article className={styles.metric}>
          <Star size={15} />
          <div>
            <span>Avg rating</span>
            <strong>{insights.averageRating ?? "—"}</strong>
          </div>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeading}><div><p>DATED WATCHES</p><h2>Viewing over time</h2></div></div>
        <div className={styles.periods} aria-label="Viewing period">
          {(["3", "12", "all"] as const).map(value => <Button key={value} size="sm"
            variant={period === value ? "primary" : "ghost"} aria-pressed={period === value}
            onClick={() => setPeriod(value)}>{value === "all" ? "All" : value + " mo"}</Button>)}
        </div>
        {context.isPending ? <Skeleton style={{ height: 130 }} /> : months.length
          ? <div className={styles.months}>{months.map(month => <div className={styles.month} key={month.month}>
              <span>{new Date(month.month + "-01T12:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" })}</span>
              <div className={styles.monthTrack} aria-label={month.episodes + " episode watches and " + month.movies + " movie watches"}>
                <i style={{ width: (month.episodes / maxWatches * 100) + "%" }}/><b style={{ width: (month.movies / maxWatches * 100) + "%" }}/>
              </div><strong>{month.episodes + month.movies}</strong>
            </div>)}</div>
          : <p className={styles.empty}>No dated watches in this period.</p>}
        <p className={styles.trendNote}>Episodes <i/> · Movies <b/>. {months.reduce((sum,month)=>sum+month.episodes+month.movies,0)} dated watches in the selected period. Older imported dates may be less reliable; completions without a date are excluded.</p>
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
          <img
            src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_1-5bdc75aaebeb75dc7ae79426ddd9be3b2be1e342510f8202baf6bffa71d7f5c4.svg"
            alt="TMDB"
          />
        </a>
        <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </section>
      </div>
    </>
  );
}

