import {MediaImage} from "../components/MediaImage";
import {useEnhancementPreferences} from "../helpers/useEnhancementPreferences";
import { useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import HomeCustomizeSheet from "../components/HomeCustomizeSheet";
import { getHomeContext } from "../endpoints/home-context_GET.schema";
import { getCrunchyrollStatus } from "../endpoints/crunchyroll-status_GET.schema";
import {getTitleProgressSummary} from "../helpers/getTitleProgressSummary";
import { useHomeLayout, type HomeSectionId } from "../helpers/homeLayout";
import type { Title } from "../helpers/Title";
import { tmdbImageUrl } from "../helpers/tmdbImageUrl";
import { usePersonalState } from "../helpers/usePersonalState";
import { useTitles } from "../helpers/useTitles";
import { useTraktStatus } from "../helpers/useTraktStatus";
import {Progress} from "../components/Progress";
import { DubBadge } from "../components/DubBadge";
import { useDubStatus } from "../helpers/useDubStatus";
import { warmAppData } from "../helpers/warmAppData";
import styles from "./_index.module.css";

const dubLabel = (hasEnDub?: boolean) => hasEnDub === undefined ? "" : hasEnDub ? ", English dub" : ", sub only";

const ZONE = "America/New_York";
const DAY = 86400000;
/** YYYY-MM-DD for an instant, as an Eastern calendar day. */
const easternDay = (value: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(new Date(value));
/** YYYY-MM-DD for a date-only value stored at midnight UTC (air and release dates). */
const storedDay = (value: string | Date) => new Date(value).toISOString().slice(0, 10);
const dayDiff = (from: string, to: string) => Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / DAY);
const dayFormat = (ymd: string, options: Intl.DateTimeFormatOptions) =>
  new Date(ymd + "T00:00:00Z").toLocaleDateString(undefined, { timeZone: "UTC", ...options });
const shortDate = (value: string | Date) =>
  new Date(value).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const clock = (value: Date) => value.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const episodeLabel = (season: number | null, episode: number | null) =>
  season != null && episode != null ? `S${season} E${episode}` : "Next episode";
/** Catalog placeholders like "Episode 4" add nothing next to "S1 E4". */
const namedEpisode = (name?: string | null) => name && !/^episode \d+$/i.test(name.trim()) ? name : null;

function Poster({ title, priority = false }: { title: Pick<Title, "title" | "posterPath">; priority?: boolean }) {
  const url = tmdbImageUrl(title.posterPath, "w342");
  return <span className={styles.poster} aria-hidden="true"><MediaImage key={url??title.title} src={url??undefined} fallback={title.title.slice(0,1)} alt="" loading={priority?"eager":"lazy"} fetchPriority={priority?"high":undefined} decoding="async"/></span>;
}

function watchedLabel(lastWatchedAt: Date | null, today: string) {
  if (!lastWatchedAt) return null;
  const ago = dayDiff(easternDay(lastWatchedAt), today);
  if (ago <= 0) return "Watched today";
  if (ago === 1) return "Watched yesterday";
  if (ago < 7) return "Watched " + new Date(lastWatchedAt).toLocaleDateString(undefined, { weekday: "long", timeZone: ZONE });
  return "Watched " + new Date(lastWatchedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: ZONE });
}

function SyncLine() {
  const trakt = useTraktStatus();
  const crunchyroll = useQuery({ queryKey: ["marquee", "crunchyroll-status"], queryFn: getCrunchyrollStatus, retry: false });
  // Wait for both sources so the line doesn't briefly show only the older one.
  // Keep the line's height while loading so the sections below don't shift when it appears.
  if (trakt.isPending || crunchyroll.isPending) return <div className={styles.syncLine} aria-hidden="true"><span className={styles.syncChipPlaceholder} /></div>;
  const sources = [
    trakt.data?.connected ? { name: "Trakt", at: trakt.data.lastSyncAt } : null,
    crunchyroll.data?.connected ? { name: "Crunchyroll", at: crunchyroll.data.lastSuccessAt } : null,
  ].filter((source): source is { name: string; at: Date | null } => Boolean(source));
  if (!sources.length) return null;
  const times = sources.map(source => source.at ? new Date(source.at) : null);
  const overdue = times.some(time => !time || Date.now() - time.getTime() > 30 * 3600000);
  const latest = times.reduce<Date | null>((max, time) => time && (!max || time > max) ? time : max, null);
  const stamp = (time: Date) => easternDay(time) === easternDay(new Date()) ? clock(time)
    : time.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ", " + clock(time);
  // October 22 design pass: sync status is a quiet chip above Up next that opens Data & sync, not a row between sections.
  return <div className={styles.syncLine}>
    <Link to="/sync" className={styles.syncChip} aria-label={(overdue ? "Sync needs a look" : latest ? "Synced " + stamp(latest) : "Not synced yet") + ". Open Data and sync"}>
      <span className={styles.syncDot} data-overdue={overdue || undefined} aria-hidden="true" />
      <strong>{overdue ? "Sync needs a look" : latest ? "Synced " + stamp(latest) : "Not synced yet"}</strong>
      <span className={styles.syncSources}>{sources.map((source, index) =>
        <span key={source.name}>{index > 0 && " · "}{source.name} {source.at ? stamp(new Date(source.at)) : "never"}</span>)}</span>
    </Link>
  </div>;
}

export default function HomePage() {
  const client = useQueryClient();
  const { data: titles = [], isPending, error } = useTitles();
  const context = useQuery({ queryKey: ["marquee", "home-context"], queryFn: getHomeContext, retry: false });
  const personal = usePersonalState();
  const preferences=useEnhancementPreferences();
  const dubs = useDubStatus().data;
  const { layout, save, reset } = useHomeLayout();
  const today = easternDay(new Date());
  const byId = new Map(titles.map(title => [Number(title.id), title]));
  const next = (context.data?.nextEpisodes ?? []).map(row => ({ row, title: byId.get(row.titleId) }))
    .filter((entry): entry is { row: typeof entry.row; title: Title } => Boolean(entry.title));
  const active = next.filter(({ row }) => row.lastWatchedAt &&
    Date.now() - new Date(row.lastWatchedAt).getTime() <= 21 * DAY);
  const newlyAvailable = next.filter(({ row }) => row.airedAt && row.lastWatchedAt &&
    new Date(row.airedAt).getTime() > new Date(row.lastWatchedAt).getTime());
  const featured = active[0] ?? newlyAvailable[0];
  const keepRows = [...active, ...newlyAvailable.filter(entry => !active.includes(entry))]
    .filter(entry => entry.row.titleId !== featured?.row.titleId).slice(0, 4);
  // Recent activity skips titles already shown in Up next or Keep watching.
  const shownAbove = new Set([featured?.row.titleId, ...keepRows.map(entry => entry.row.titleId)]);
  const hasNext = new Set(next.map(entry => entry.row.titleId));
  const recent = titles.filter(title => title.lastWatched && !shownAbove.has(Number(title.id)))
    .sort((a, b) => (b.lastWatched ?? "").localeCompare(a.lastWatched ?? "")).slice(0, 3);
  const lastEpisodes = new Map((context.data?.lastEpisodes ?? []).map(row => [row.titleId, row]));
  const pickKey = preferences.data?.["pick-next"]?.key;
  const watchlist = (personal.data?.watchlist ?? []).filter(row => row.pendingAction !== "remove");
  const saved = [...watchlist].sort((a,b)=>Number(pickKey===b.mediaType+":"+b.traktId)-Number(pickKey===a.mediaType+":"+a.traktId)).slice(0, 6);
  const upcoming = [
    ...(context.data?.upcoming ?? []).flatMap(row => {
      const title = byId.get(row.titleId);
      return title ? [{ key: "e" + row.titleId, day: storedDay(row.airedAt), name: title.title, to: "/titles/" + title.id,
        detail: episodeLabel(row.seasonNumber, row.episodeNumber) + " · " + dayFormat(storedDay(row.airedAt), { weekday: "long" }) }] : [];
    }),
    ...watchlist.filter(row => row.releaseDate && dayDiff(today, storedDay(row.releaseDate)) > 0 && dayDiff(today, storedDay(row.releaseDate)) <= 120)
      .map(row => ({ key: "w" + row.id, day: storedDay(row.releaseDate!), name: row.title, to: row.titleId ? "/titles/" + row.titleId : "/watchlist",
        detail: (row.isAnime ? "Anime" : row.mediaType === "movie" ? "Movie" : "Series") + " · on your Watch List" })),
  ].sort((a, b) => a.day.localeCompare(b.day)).slice(0, 4);
  const featuredProgress = featured ? getTitleProgressSummary(featured.title) : null;
  const backdrop = featured ? tmdbImageUrl(featured.title.backdropPath, "w780") : undefined;
  const refresh = () => void client.invalidateQueries({ queryKey: ["marquee"] });
  const contextReady = !isPending && !context.isPending;
  const warmIds = [featured, ...keepRows].filter(Boolean).map(entry => entry!.row.titleId).join(",");
  useEffect(() => {
    if (contextReady) return warmAppData(client, warmIds ? warmIds.split(",").map(Number) : []);
  }, [contextReady, warmIds, client]);

  const sections: Record<HomeSectionId, { place: "main" | "side" | "full"; node: ReactNode }> = {
    keep: { place: "main", node: contextReady && (keepRows.length > 0 || !featured) && <section className={styles.section} aria-labelledby="home-keep">
      <div className={styles.heading}><div><h2 id="home-keep">Keep watching</h2>{keepRows.length > 0 && <span className={styles.count}>{keepRows.length} series</span>}</div><Link to="/library?view=titles">Library <ArrowRight size={14}/></Link></div>
      {/* Grid (October 15): a poster strip with a badge, GameDeck's cover-strip pattern. */}
      {/* October 22: one or two series read as title rows with progress; three or more become the poster strip. */}
      {keepRows.length > 0 && keepRows.length <= 2 ? <div className={styles.rows}>{keepRows.map(({ row, title }) => { const progress = getTitleProgressSummary(title); const ready = row.readyCount ?? 0;
        const next = episodeLabel(row.seasonNumber, row.episodeNumber);
        return <Link className={styles.row} to={"/titles/" + title.id} key={title.id}>
          <Poster title={title}/>
          <span className={styles.rowCopy}><strong>{title.title}</strong>
            <small>{next} next{ready > 1 && <> · <span className={styles.ready}>{ready} ready</span></>}{progress.released > 0 && <> · {progress.watched} of {progress.released}</>}</small>
            {progress.released > 0 && <Progress value={progress.percent} className={styles.rowProgress} aria-label={title.title + " progress"} aria-valuetext={progress.watched + " of " + progress.released + " released episodes watched"}/>}
          </span>
          <DubBadge hasEnDub={dubs?.get(row.titleId)}/>
          <ChevronRight className={styles.rowAction} size={17} aria-hidden="true"/>
        </Link>; })}</div>
      : keepRows.length ? <div className={styles.strip}>{keepRows.map(({ row, title }) => { const progress = getTitleProgressSummary(title); const ready = row.readyCount ?? 0;
        const next = episodeLabel(row.seasonNumber, row.episodeNumber);
        return <Link className={styles.stripItem} to={"/titles/" + title.id} key={title.id}
          aria-label={title.title + ", " + next + " next" + dubLabel(dubs?.get(row.titleId)) + (ready > 1 ? ", " + ready + " episodes ready" : "") + (progress.released > 0 ? ", " + progress.watched + " of " + progress.released + " watched" : "")}>
          <span className={styles.stripCover}><Poster title={title}/><DubBadge hasEnDub={dubs?.get(row.titleId)} overlay/><span className={styles.stripBadge}>{ready > 1 ? ready + " ready" : next}</span></span>
          <strong>{title.title}</strong></Link>; })}</div>
        : <p className={styles.empty}>No recently active series has an unwatched released episode. <Link to="/library">Browse history <ArrowRight size={13}/></Link></p>}
    </section> },
    upcoming: { place: "side", node: contextReady && <section className={styles.section} aria-labelledby="home-upcoming">
      <div className={styles.heading}><div><h2 id="home-upcoming">Coming up</h2></div></div>
      {upcoming.length ? <div className={styles.rows}>{upcoming.map(item => { const days = dayDiff(today, item.day);
        return <Link className={styles.row} to={item.to} key={item.key}>
          <span className={styles.dateChip} aria-hidden="true"><small>{dayFormat(item.day, { month: "short" })}</small><strong>{dayFormat(item.day, { day: "numeric" })}</strong></span>
          <span className={styles.rowCopy}><strong>{item.name}</strong><small>{item.detail}</small></span>
          <span className={styles.countdown}><span className={styles.visuallyHidden}>{dayFormat(item.day, { month: "long", day: "numeric" })}, </span>{days === 1 ? "Tomorrow" : "In " + days + " days"}</span>
        </Link>; })}</div>
        : personal.isPending ? <Skeleton style={{ height: 72 }} /> : <p className={styles.empty}>Nothing dated in the next few weeks.</p>}
    </section> },
    recent: { place: "main", node: <section className={styles.section} aria-labelledby="home-recent">
      <div className={styles.heading}><div><h2 id="home-recent">Recent activity</h2></div><Link to="/library">Activity <ArrowRight size={14}/></Link></div>
      {recent.length ? <div className={styles.strip}>{recent.map(title => {
        const last = lastEpisodes.get(Number(title.id));
        const sameDay = last && title.lastWatched && easternDay(last.watchedAt) === easternDay(title.lastWatched);
        const progress = getTitleProgressSummary(title);
        // Synced totals can trail the catalog; never call a show caught up while it has a released unwatched episode.
        const done = title.type === "show" && !hasNext.has(Number(title.id)) && (progress.status === "caught-up" || progress.status === "complete");
        const what = title.type === "movie" ? "Movie" : sameDay ? episodeLabel(last.seasonNumber, last.episodeNumber) + (namedEpisode(last.episodeTitle) ? " " + last.episodeTitle : "") : "Last watched";
        const when = new Date(title.lastWatched!).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: ZONE });
        return <Link to={"/titles/" + title.id} className={styles.stripItem} key={title.id} aria-label={title.title + ", " + what + ", " + shortDate(title.lastWatched!) + (done ? ", " + progress.statusLabel : "")}>
          <span className={styles.stripCover}><Poster title={title}/><span className={styles.stripBadge}>{when}</span></span>
          <strong>{title.title}</strong></Link>; })}</div> : !isPending && <p className={styles.empty}>No dated watch activity yet.</p>}
    </section> },
    watchlist: { place: "full", node: <section className={styles.section + " " + styles.shelf} aria-labelledby="home-watchlist">
      <div className={styles.heading}><div><h2 id="home-watchlist">On your Watch List</h2></div><Link to="/watchlist">{watchlist.length > saved.length ? "See all " + watchlist.length : "See all"} <ArrowRight size={14}/></Link></div>
      {saved.length ? <div className={styles.activityList}>{saved.map(row =>
        <Link className={styles.activityRow} key={row.id} to={row.titleId ? "/titles/" + row.titleId : "/watchlist"}>
          <Poster title={{ title: row.title, posterPath: row.posterPath ?? undefined }}/>
          <span><strong>{pickKey===row.mediaType+":"+row.traktId?"★ Pick next · ":""}{row.title}</strong><small>{row.releaseDate && dayDiff(today, storedDay(row.releaseDate)) > 0 ? dayFormat(storedDay(row.releaseDate), { month: "short", day: "numeric" }) : row.year ?? "—"} · {row.isAnime ? "Anime" : row.mediaType === "movie" ? "Movie" : "Series"}</small>
            {row.titleId !== null && <DubBadge hasEnDub={dubs?.get(row.titleId)}/>}</span>
          <ChevronRight className={styles.rowAction} size={17} aria-hidden="true"/>
        </Link>)}</div> : personal.isPending ? <div className={styles.activityList} aria-busy="true" aria-label="Loading Watch List"><Skeleton className={styles.shelfSkeleton} /><Skeleton className={styles.shelfSkeleton} /><Skeleton className={styles.shelfSkeleton} /></div>
        : personal.error ? <p className={styles.error} role="alert">Watch List could not load. <Button variant="ghost" onClick={() => void personal.refetch()}>Retry</Button></p>
        : <p className={styles.empty}>Save a title to keep it here.</p>}
    </section> },
  };

  return <>
    <Helmet><title>Home · Marquee</title></Helmet>
    {error && <p className={styles.error} role="alert">Unable to load your library. <Button variant="ghost" onClick={refresh}>Retry</Button></p>}
    {context.error && <p className={styles.error} role="alert">Next episodes could not load. <Button variant="ghost" onClick={refresh}>Retry</Button></p>}
    <SyncLine />
    <div className={styles.top}>
    {(isPending || context.isPending) && <Skeleton className={styles.featuredSkeleton} />}
    {!isPending && !context.isPending && featured && <section className={styles.featured} data-backdrop={backdrop ? "" : undefined} aria-labelledby="home-up-next">
      {backdrop && <span className={styles.backdrop} aria-hidden="true">
        <MediaImage className={styles.backdropFill} src={backdrop} fallback="" alt="" decoding="async"/>
        <MediaImage className={styles.backdropArt} src={backdrop} fallback="" alt="" decoding="async"/></span>}
      <Poster title={featured.title} priority />
      <div className={styles.featuredCopy}>
        <div className={styles.kindRow}><span className={styles.kind}>Up next · {featured.title.anime ? "Anime" : "Series"}</span>
          {watchedLabel(featured.row.lastWatchedAt, today) && <span className={styles.pill}>{watchedLabel(featured.row.lastWatchedAt, today)}</span>}
          <DubBadge hasEnDub={dubs?.get(featured.row.titleId)}/></div>
        <h2 id="home-up-next">{featured.title.title}</h2>
        <p className={styles.episodeLine}><strong>{episodeLabel(featured.row.seasonNumber, featured.row.episodeNumber)}{namedEpisode(featured.row.episodeTitle) ? " · " + featured.row.episodeTitle : ""}</strong>
          {featured.row.runtimeMinutes ? <span> · {featured.row.runtimeMinutes} min</span> : null}
          {!featured.row.airedAt && <span> · Air date unknown</span>}</p>
        {featured.row.overview && <p className={styles.synopsis}>{featured.row.overview}</p>}
        {featuredProgress&&featuredProgress.released>0?<div className={styles.homeProgress}><div><span><strong>{featuredProgress.watched} of {featuredProgress.released} watched</strong> · {featuredProgress.remaining} left</span><strong>{featuredProgress.percent}%</strong></div><Progress value={featuredProgress.percent} className={styles.progressTrack} aria-label="Series progress through released episodes" aria-valuetext={featuredProgress.watched+" of "+featuredProgress.released+" released episodes watched"}/></div>:<p className={styles.progressUnknown}>Episode total unavailable</p>}
        <div className={styles.featuredActions}><Button asChild><Link to={"/titles/"+featured.title.id}>Next episode <ArrowRight size={14}/></Link></Button></div>
      </div>
    </section>}
    </div>
    {(isPending || context.isPending) && <div className={styles.loadingGrid} aria-busy="true"><Skeleton style={{ height: 150 }} /><Skeleton style={{ height: 220 }} /></div>}
    {/* Wait for both the library and Home context so Up next doesn't pop in above already-drawn sections. */}
    {!isPending && !context.isPending && <div className={styles.dashboard}>
      {layout.order.filter(id => !layout.hidden.includes(id)).map(id => sections[id].node &&
        <div key={id} className={styles[sections[id].place]}>{sections[id].node}</div>)}
    </div>}
    {!isPending && !context.isPending && <div className={styles.customize}><HomeCustomizeSheet layout={layout} onChange={save} onReset={reset} /></div>}
  </>;
}
