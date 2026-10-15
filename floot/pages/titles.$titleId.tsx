import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from "../components/Dialog";
import { useRef,useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock3,
  Ellipsis,
  Film,
  Layers3,
  PlayCircle,
  RotateCcw,
  Star,
  Undo2,
  ExternalLink,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/Accordion";
import { Skeleton } from "../components/Skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/Collapsible";
import { Button } from "../components/Button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/DropdownMenu";
import { MediaImage } from "../components/MediaImage";
import TraktActions from "../components/TraktActions";
import { changeTracking } from "../endpoints/tracking_POST.schema";
import { getCatalogDetail } from "../endpoints/catalog-detail_GET.schema";
import { getEpisodeCatalog } from "../endpoints/episode-catalog_GET.schema";
import { getTitleProgressSummary } from "../helpers/getTitleProgressSummary";
import { tmdbImageUrl } from "../helpers/tmdbImageUrl";
import { useTitleEpisodes } from "../helpers/useTitleEpisodes";
import { usePersonalState } from "../helpers/usePersonalState";
import { useTitles } from "../helpers/useTitles";
import styles from "./titles.$titleId.module.css";

// Match catalog progress and tracking eligibility: known release instant, or unknown for catch-up only.
const hasAired = (date:Date|null)=>!date||new Date(date).getTime()<=Date.now();

export default function TitleDetailPage() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [trackingMessage, setTrackingMessage] = useState("");
  const [trackingError,setTrackingError]=useState("");
  const [confirmation,setConfirmation]=useState<{key:string;change:Parameters<typeof changeTracking>[0];label:string;count:number;unknown:number}|null>(null);
  const cancelRef=useRef<HTMLButtonElement>(null),triggerRef=useRef<HTMLButtonElement|null>(null);
  const requestCatchUp=(trigger:HTMLButtonElement,key:string,change:Parameters<typeof changeTracking>[0],label:string,count:number,unknown:number)=>{triggerRef.current=trigger;setTrackingError("");setConfirmation({key,change,label,count,unknown});};
  const { titleId } = useParams();
  const { data: titles = [], isFetching, error,refetch:refetchTitle } = useTitles();
  const { data: personal } = usePersonalState();
  const title = titles.find(t => t.id === titleId);
  const numericTitleId = titleId && Number.isFinite(Number(titleId))
    ? Number(titleId)
    : null;
  const catalog = useQuery({
    queryKey: ["marquee", "catalog-detail", numericTitleId],
    enabled: numericTitleId !== null,
    queryFn: () => getCatalogDetail(numericTitleId!),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
  const {
    data: relationalData,
    isFetching: isRelationalFetching,
    error: relationalError,
    refetch:refetchEpisodes,
  } = useTitleEpisodes(numericTitleId);
  const metadataTarget = title?.type === "show" && (title.watchedEpisodes ?? 0) > 0
    ? (relationalData?.seasons ?? []).flatMap(season =>
        (relationalData?.episodes ?? []).filter(episode => episode.seasonId === season.id)
          .map(episode => ({ season, episode })))
        .find(({ episode }) => hasAired(episode.airedAt) &&
          !relationalData?.undatedEpisodeIds?.includes(episode.id) &&
          !relationalData?.watchEvents.some(event => event.episodeId === episode.id))
    : undefined;
  const episodeCatalog = useQuery({
    queryKey: ["marquee", "episode-catalog", numericTitleId,
      metadataTarget?.season.seasonNumber, metadataTarget?.episode.episodeNumber],
    enabled: numericTitleId !== null && metadataTarget?.season.seasonNumber != null &&
      metadataTarget?.episode.episodeNumber != null &&
      (!metadataTarget.episode.overview || !metadataTarget.episode.tmdbStillPath),
    queryFn: () => getEpisodeCatalog(numericTitleId!, metadataTarget!.season.seasonNumber!,
      metadataTarget!.episode.episodeNumber!),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
  const saveTracking = async (
    key: string,
    change: Parameters<typeof changeTracking>[0]
  ) => {
    if(busy!==null)return false;
    setBusy(key);
    setTrackingMessage("");setTrackingError("");
    try {
      const result = await changeTracking(change);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["marquee", "titles"] }),
        queryClient.invalidateQueries({ queryKey: ["marquee", "title-episodes", numericTitleId] }),
        queryClient.invalidateQueries({ queryKey: ["marquee", "watch-history"] }),
        queryClient.invalidateQueries({ queryKey: ["marquee", "home-context"] }),
        queryClient.invalidateQueries({ queryKey: ["marquee", "insights-context"] }),
        ...(change.action === "viewing" ? [queryClient.invalidateQueries({ queryKey: ["marquee", "personal-state"] })] : []),
      ]);
      setTrackingMessage(result.synced ? "Synced with Trakt." : key === "status" ? "Status updated." : result.message ?? "Tracking saved.");
      return true;
    } catch (error) {
      setTrackingError(error instanceof Error ? error.message : "Unable to save tracking.");
      return false;
    } finally {
      setBusy(null);
    }
  };
  // Preserve old links to the duplicate Trakt entries after reconciliation.
  const mergedTitleId = titleId === "102" ? "44" : titleId === "112" ? "42" : null;
  if (mergedTitleId) return <Navigate to={`/titles/${mergedTitleId}`} replace />;
  if (isFetching && titles.length === 0) return <Skeleton style={{height: 360}} />;
  if (error && !titles.length) return <div className={styles.empty} role="alert"><p>Unable to load this title. <Button variant="ghost" onClick={()=>void refetchTitle()}>Retry</Button></p></div>;
  if (!title) return <div className={styles.empty}>
    <Helmet><title>Title not found · Marquee</title></Helmet>
    <h1>Title not found</h1>
    <p>This title isn’t in your library. It may have been merged with another entry or removed.</p>
    <div className={styles.emptyActions}>
      <Button asChild><Link to="/library?view=titles">Search titles</Link></Button>
      <Button asChild variant="outline"><Link to="/">Go to Home</Link></Button>
    </div>
  </div>;

  const progress = getTitleProgressSummary(title);
  const effectiveRating = personal?.ratings.find(row =>
    row.titleId === numericTitleId && row.pendingAction !== "remove")?.rating
    ?? relationalData?.localRating ?? title.score;
  const manualStatus = relationalData?.manualStatus;
  const overrideLabel = manualStatus && manualStatus !== "planned"
    ? manualStatus.charAt(0).toUpperCase() + manualStatus.slice(1)
    : null;
  const displayStatusLabel = overrideLabel ? `${overrideLabel} · manual` : progress.statusLabel;
  const statusTone = overrideLabel ? "in-progress" : progress.status;
  const statusIcon = overrideLabel === "Completed" || (!overrideLabel && (progress.status === "complete" || progress.status === "caught-up"))
    ? <CheckCircle2 size={13} />
    : overrideLabel === "Watching" || (!overrideLabel && progress.status === "in-progress")
      ? <CircleDot size={13} />
      : <Clock3 size={13} />;
  const posterUrl = tmdbImageUrl(title.posterPath, "w500");
  const backdropUrl = tmdbImageUrl(title.backdropPath, "w780");
  const watchCounts = new Map<number, number>();
  for (const event of relationalData?.watchEvents ?? []) {
    watchCounts.set(event.episodeId, (watchCounts.get(event.episodeId) ?? 0) + 1);
  }
  const undatedEpisodes = new Set(relationalData?.undatedEpisodeIds ?? []);
  const correctedEpisodes = new Set(relationalData?.unwatchedEpisodeIds ?? []);
  const seriesCatchUpEpisodes = new Set(relationalData?.seriesCompletionIds ?? []);
  const seasonCatchUpEpisodes = new Set((relationalData?.manualCompletionIds ?? []).filter(id => !seriesCatchUpEpisodes.has(id)));
  const latestManualMovie = relationalData?.movieEvents?.find(event => event.source === "manual");
  const seasonGroups = (relationalData?.seasons ?? []).map((season) => {
    const episodes = (relationalData?.episodes ?? []).filter(
      (episode) => episode.seasonId === season.id
    );
    const watched = (episode: typeof episodes[number]) =>
      (watchCounts.get(episode.id) ?? 0) > 0 || undatedEpisodes.has(episode.id);
    const eligibleEpisodes = episodes.filter(episode => hasAired(episode.airedAt));
    const releasedEpisodes = episodes.filter(episode=>Boolean(episode.airedAt)&&hasAired(episode.airedAt));
    return {
      season,
      episodes,
      releasedCount:releasedEpisodes.length,
      releasedWatched:releasedEpisodes.filter(watched).length,
      unknownCount:episodes.filter(episode=>!episode.airedAt).length,
      eligibleCount: eligibleEpisodes.length,
      eligibleWatched: eligibleEpisodes.filter(watched).length,
      seasonCatchUpCount: episodes.filter(episode => seasonCatchUpEpisodes.has(episode.id)).length,
    };
  });
  const catalogReleasedCount = seasonGroups.reduce((count, group) => count + group.releasedCount, 0);
  const catalogProgressMismatch = Boolean(relationalData) && catalogReleasedCount !== progress.released;
  const seriesEligible = seasonGroups.reduce((count, group) => count + group.eligibleCount, 0);
  const seriesWatched = seasonGroups.reduce((count, group) => count + group.eligibleWatched, 0);
  const nextEpisode = title.type === "show" && (title.watchedEpisodes ?? 0) > 0
    ? seasonGroups.flatMap(({ season, episodes }) => episodes.map(episode => ({ season, episode })))
        .find(({ episode }) => hasAired(episode.airedAt) &&
          !((watchCounts.get(episode.id) ?? 0) > 0 || undatedEpisodes.has(episode.id)))
    : undefined;
  const focusSeasonId = nextEpisode?.season.id ?? seasonGroups.find(({ episodes }) =>
    episodes.some(episode => hasAired(episode.airedAt) &&
      (watchCounts.get(episode.id) ?? 0) === 0 && !undatedEpisodes.has(episode.id))
  )?.season.id;
  // Use dated check-ins only. Historical bulk completions have no reliable watch day.
  const episodeById = new Map((relationalData?.episodes ?? []).map(episode => [episode.id, episode]));
  const seasonById = new Map((relationalData?.seasons ?? []).map(season => [season.id, season]));
  const datedActivity = title.type === "show"
    ? (relationalData?.watchEvents ?? []).map(event => {
        const episode = episodeById.get(event.episodeId);
        const season = episode ? seasonById.get(episode.seasonId) : null;
        const number = season?.seasonNumber != null && episode?.episodeNumber != null
          ? `S${season.seasonNumber} E${episode.episodeNumber}`
          : episode?.displayTitle || "Episode";
        return { watchedAt: new Date(event.watchedAt), label: number };
      })
    : (relationalData?.movieEvents ?? []).map(event => ({
        watchedAt: new Date(event.watchedAt), label: "Movie watched",
      }));
  const activityDays = new Map<string, { date: Date; count: number; latest: string }>();
  for (const event of datedActivity.sort((a, b) => b.watchedAt.getTime() - a.watchedAt.getTime())) {
    if (!Number.isFinite(event.watchedAt.getTime()) || event.watchedAt.getFullYear() < 1980) continue;
    const date = event.watchedAt;
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const day = activityDays.get(dayKey);
    if (day) day.count += 1;
    else if (activityDays.size < 3) activityDays.set(dayKey, { date, count: 1, latest: event.label });
    else break;
  }
  const recentActivity = Array.from(activityDays.values()).slice(0, 3);
  const nextStillPath = nextEpisode?.episode.tmdbStillPath || episodeCatalog.data?.stillPath;

  return (
    <>
      <Helmet><title>{title.title} · Marquee</title></Helmet>
      {error && <p className={styles.empty} role="alert">Couldn’t refresh this title. Showing saved data.</p>}
      <div className={styles.detailLayout}>
      <section className={[styles.hero, backdropUrl ? styles.heroWithArtwork : ""].filter(Boolean).join(" ")}>
        {backdropUrl && (
          <img className={styles.backdrop} src={backdropUrl} alt="" aria-hidden="true" />
        )}
        <div className={styles.poster}>
          {posterUrl ? (
            <MediaImage key={posterUrl} src={posterUrl} alt="" decoding="async" fallback={title.title.slice(0,1)} />
          ) : (
            <span>{title.title.slice(0,1)}</span>
          )}
          <i />
        </div>
        <div className={styles.copy}>
          <p className={styles.kicker}>{title.anime ? "Anime · " : ""}{title.type === "show" ? "Series" : "Movie"}</p>
          <h1>{title.title}</h1>
          <div className={styles.meta}>
            {title.year && <span><CalendarDays size={13}/>{title.year}</span>}
            {title.tmdbStatus && <span>{title.tmdbStatus}</span>}
          </div>
      {nextEpisode && numericTitleId && !["paused", "dropped"].includes(manualStatus ?? "") && (
        <section className={[styles.nextEpisode, nextStillPath ? styles.nextEpisodeWithImage : ""].filter(Boolean).join(" ")} aria-label="Next episode">
          {nextStillPath &&
            <img src={tmdbImageUrl(nextStillPath, "w342") ?? ""} alt="" loading="lazy" decoding="async" />}
          <div className={styles.nextCopy}>
            <span>{nextEpisode.episode.airedAt ? "READY TO WATCH" : "UP NEXT"} · S{nextEpisode.season.seasonNumber ?? "—"} E{nextEpisode.episode.episodeNumber ?? "—"}</span>
            <h2>{nextEpisode.episode.displayTitle || "Next episode"}</h2>
            {(nextEpisode.episode.airedAt || nextEpisode.episode.runtimeMinutes || episodeCatalog.data?.runtimeMinutes) &&
              <p>{nextEpisode.episode.airedAt &&
                <>Aired {new Date(nextEpisode.episode.airedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</>}
                {nextEpisode.episode.airedAt && (nextEpisode.episode.runtimeMinutes || episodeCatalog.data?.runtimeMinutes) && " · "}
                {(nextEpisode.episode.runtimeMinutes || episodeCatalog.data?.runtimeMinutes) &&
                  <>{nextEpisode.episode.runtimeMinutes || episodeCatalog.data?.runtimeMinutes} min</>}
              </p>}
            {(nextEpisode.episode.overview || episodeCatalog.data?.overview) &&
              <p className={styles.nextOverview}>{nextEpisode.episode.overview || episodeCatalog.data?.overview}</p>}
          </div>
        </section>
      )}
      {title.type === "movie" && (catalog.data?.detail?.runtimeMinutes || catalog.data?.detail?.released || recentActivity[0]) && (
        <dl className={styles.movieFacts}>
          {catalog.data?.detail?.runtimeMinutes && <div><dt>Runtime</dt><dd>{catalog.data.detail.runtimeMinutes} min</dd></div>}
          {catalog.data?.detail?.released && <div><dt>Released</dt><dd>{new Date(catalog.data.detail.released + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</dd></div>}
          {recentActivity[0] && <div><dt>Last watched</dt><dd>{recentActivity[0].date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</dd></div>}
        </dl>
      )}
          {numericTitleId && <TraktActions
        titleId={numericTitleId}
        statusLabel={displayStatusLabel}
        statusIcon={statusIcon}
        displayRating={effectiveRating}
        localRating={relationalData?.localRating}
        status={relationalData?.manualStatus}
        statusDisabled={busy !== null || isRelationalFetching}
        onStatusChange={value => void saveTracking("status", {
          action: "status", titleId: numericTitleId,
          status: value,
        })}
      />}
        </div>
      </section>

      {title.overview && <p className={styles.overview}>{title.overview}</p>}



      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div>
          <h2>{title.type === "show" ? "Episode progress" : "Viewing"}</h2>
          </div>
          {title.type === "show" && <strong>{progress.percent}%</strong>}
        </div>
        {/* A movie's status already shows in the title controls; only series get a progress bar. */}
        {title.type === "show" && <>
          <div className={styles.track}><span style={{width: progress.percent + "%"}} /></div>
          <div className={styles.stats}>
            <div><PlayCircle size={16}/><strong>{progress.watched}</strong><span>Watched</span></div>
            <div><Layers3 size={16}/><strong>{progress.released}</strong><span>Released</span></div>
            <div><Film size={16}/><strong>{progress.remaining}</strong><span>Remaining</span></div>
          </div>
        </>}
        {title.type === "movie" && numericTitleId && <div className={styles.movieActions}>
          <Button size="sm" variant="outline" disabled={busy !== null}
            onClick={() => void saveTracking("movie", {
              action: "log", kind: "movie", titleId: numericTitleId,
              requestId: crypto.randomUUID(),
            })}>
            <CheckCircle2 size={14} />
            {progress.watched ? "Log rewatch" : "Mark watched"}
          </Button>
          {latestManualMovie && <Button size="sm" variant="ghost" disabled={busy !== null}
            onClick={() => void saveTracking("movie", {
              action: "undo", kind: "movie", titleId: numericTitleId,
              eventId: latestManualMovie.id,
            })}>
            <Undo2 size={14} /> Undo my check-in
          </Button>}
        </div>}
      </section>

      <section className={styles.activity}>
        <div className={styles.activityHeading}>
          <h2>Watch history</h2>
        </div>
        {recentActivity.length ? (
          <ol className={styles.timeline} aria-label="Recent watch days">
            {recentActivity.map((day, index) => (
              <li key={day.date.toISOString()} className={styles.timelineDay}>
                <span className={styles.node} aria-hidden="true" />
                <div>
                  <strong>{index === 0 ? "Last watched" : "Earlier watch"}</strong>
                  <p>
                    <time dateTime={`${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, "0")}-${String(day.date.getDate()).padStart(2, "0")}`}>
                      {day.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </time>
                    {" · "}{day.count} {title.type === "show" ? day.count === 1 ? "episode" : "episodes" : day.count === 1 ? "watch" : "watches"}
                    {title.type === "show" && <> · {day.latest}{day.count > 1 ? " latest" : ""}</>}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.activityEmpty}>
            {isRelationalFetching && !relationalData ? "Loading watch history…" : progress.watched ? "Watched · date unknown" : "No watch activity yet"}
          </p>
        )}
      </section>

      {(title.overview || catalog.data?.detail || catalog.isPending || catalog.error) && <section className={styles.catalogSection}>
        <h2>About {title.type === "show" ? "the series" : "the movie"}</h2>
        {catalog.isPending && <Skeleton style={{ height: 64 }} />}
        {catalog.error && <p className={styles.catalogNotice}>More details are unavailable. <Button variant="ghost" onClick={() => void catalog.refetch()}>Retry</Button></p>}
        {catalog.data?.detail && <>
          <dl className={styles.catalogFacts}>
            {catalog.data.detail.released && <div><dt>First released</dt><dd>{new Date(catalog.data.detail.released + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</dd></div>}
            {catalog.data.detail.runtimeMinutes && <div><dt>{title.type === "show" ? "Episode length" : "Runtime"}</dt><dd>{catalog.data.detail.runtimeMinutes} min</dd></div>}
            {catalog.data.detail.genres.length > 0 && <div><dt>Genres</dt><dd>{catalog.data.detail.genres.join(" · ")}</dd></div>}
            {catalog.data.detail.creators.length > 0 && <div><dt>{title.type === "show" ? "Creators" : "Director"}</dt><dd>{catalog.data.detail.creators.join(" · ")}</dd></div>}
            {catalog.data.detail.cast.length > 0 && <div><dt>Cast</dt><dd>{catalog.data.detail.cast.join(" · ")}</dd></div>}
            {catalog.data.detail.networks.length > 0 && <div><dt>Network</dt><dd>{catalog.data.detail.networks.join(" · ")}</dd></div>}
            {catalog.data.detail.studios.length > 0 && <div><dt>Studio</dt><dd>{catalog.data.detail.studios.join(" · ")}</dd></div>}
          </dl>
          <a className={styles.catalogLink} href={catalog.data.detail.website} target="_blank" rel="noopener noreferrer">View on TMDB <ExternalLink size={14}/></a>
        </>}
      </section>}

      {title.type === "show" && (
        <section className={styles.episodeSection}>
          <div className={styles.episodeHeading}>
            <div>
              <h2>Seasons & episodes</h2>
            </div>
          </div>

          {isRelationalFetching && !relationalData ? (
            <div className={styles.episodeLoading}>
              <Skeleton style={{ height: 54 }} />
              <Skeleton style={{ height: 54 }} />
            </div>
          ) : relationalError ? (
            <p className={styles.episodeMessage} role="alert">Unable to load episode details. <Button variant="ghost" onClick={()=>void refetchEpisodes()}>Retry</Button></p>
          ) : seasonGroups.length === 0 ? (
            <p className={styles.episodeMessage}>
              Detailed season and episode data has not been imported for this title yet.
            </p>
          ) : (
            <>
            {catalogProgressMismatch && (() => {
              const gap = Math.abs(catalogReleasedCount - progress.released);
              const plural = gap === 1 ? "episode" : "episodes";
              return <Collapsible className={styles.episodeMessage}>
                <p>{catalogReleasedCount > progress.released
                  ? `${gap} newer ${plural} ${gap === 1 ? "is" : "are"} listed below but not counted in your progress yet.`
                  : `${gap} released ${plural} ${gap === 1 ? "is" : "are"} missing from the list below.`}</p>
                <CollapsibleTrigger className={styles.countTrigger}>How this is counted</CollapsibleTrigger>
                <CollapsibleContent><p>Episode progress uses the synced series total: {progress.released} released. The seasons below use the episode catalog: {catalogReleasedCount} dated releases. Season totals and Mark watched actions follow the catalog.</p></CollapsibleContent>
              </Collapsible>;
            })()}
            {numericTitleId && seriesEligible > 0 && <div className={styles.seriesActions}>
              <Button size="sm" variant="outline" disabled={busy !== null || seriesWatched === seriesEligible}
                onClick={event => requestCatchUp(event.currentTarget,"series",{action:"series",titleId:numericTitleId},title.title,seriesEligible-seriesWatched,seasonGroups.flatMap(group=>group.episodes).filter(episode=>!episode.airedAt&&!((watchCounts.get(episode.id)??0)>0||undatedEpisodes.has(episode.id))).length)}>
                <CheckCircle2 size={14} />
                {seriesWatched === seriesEligible ? "Available episodes watched" : "Mark available episodes watched"}
              </Button>
              {(seriesCatchUpEpisodes.size > 0 || Boolean(relationalData?.seriesCorrectedIds?.length)) && <Button size="sm" variant="ghost" disabled={busy !== null}
                onClick={() => void saveTracking("series", { action: "seriesUndo", titleId: numericTitleId })}>
                <Undo2 size={14} /> Undo series catch-up
              </Button>}
            </div>}
            <Accordion
              type="single"
              collapsible
              key={focusSeasonId ?? "no-unwatched-season"}
              defaultValue={focusSeasonId != null ? String(focusSeasonId) : undefined}
              className={styles.seasonAccordion}
            >
              {seasonGroups.map(({ season, episodes, releasedCount, releasedWatched, unknownCount, eligibleCount, eligibleWatched, seasonCatchUpCount }) => {
                const seasonRating = relationalData?.seasonRatings?.find(row => row.seasonId === season.id);
                const seasonStatus = relationalData?.seasonStatuses?.find(row => row.seasonId === season.id);
                const seasonLabel = season.seasonNumber !== null
                  ? "Season " + season.seasonNumber
                  : season.displayTitle ?? "Season";
                return (
                  <AccordionItem
                    key={season.id}
                    value={String(season.id)}
                    className={styles.seasonItem}
                  >
                    <AccordionTrigger className={styles.seasonTrigger}>
                      <div className={styles.seasonSummary}>
                        <div>
                          <strong>{seasonLabel}</strong>
                          <span>{releasedCount} {catalogProgressMismatch?"catalog released episodes":"released episodes"}{unknownCount?" · "+unknownCount+" air dates unknown":""}
                            {seasonRating ? " · " + seasonRating.score + "/10" : ""}
                            {seasonStatus ? " · " + seasonStatus.status : ""}
                          </span>
                        </div>
                        <span className={styles.seasonProgress}>
                          {releasedCount?releasedWatched+"/"+releasedCount+(catalogProgressMismatch?" catalog released":" released"):"Release dates unknown"}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className={styles.seasonContent}>
                      {numericTitleId && eligibleCount > 0 && <div className={styles.seasonActions}>
                        <Button size="sm" variant="outline" disabled={busy !== null || eligibleWatched === eligibleCount}
                          onClick={event => requestCatchUp(event.currentTarget,"season:"+season.id,{action:"season",titleId:numericTitleId,seasonId:season.id},title.title+" · "+seasonLabel,eligibleCount-eligibleWatched,episodes.filter(episode=>!episode.airedAt&&!((watchCounts.get(episode.id)??0)>0||undatedEpisodes.has(episode.id))).length)}>
                          <CheckCircle2 size={14} /> {eligibleWatched === eligibleCount ? "Season watched" : "Mark season watched"}
                        </Button>
                        {seasonCatchUpCount > 0 && <Button size="sm" variant="ghost" disabled={busy !== null}
                          onClick={() => void saveTracking("season:" + season.id, {
                            action: "seasonUndo", titleId: numericTitleId, seasonId: season.id,
                          })}>
                          <Undo2 size={14} /> Undo season catch-up
                        </Button>}
                        <span>Records missing aired episodes without inventing watch dates.</span>
                      </div>}
                      <div className={styles.episodeList}>
                        {episodes.map((episode) => {
                          const watchCount = watchCounts.get(episode.id) ?? 0;
                          const latestManualEvent = relationalData?.watchEvents?.find(
                            event => event.episodeId === episode.id && event.source === "manual"
                          );
                          const watched = watchCount > 0 || undatedEpisodes.has(episode.id);
                          const corrected = correctedEpisodes.has(episode.id);
                          const episodeLabel = episode.episodeNumber !== null
                            ? "E" + episode.episodeNumber
                            : episode.absoluteNumber !== null
                              ? "#" + episode.absoluteNumber
                              : "EP";
                          const episodeTitle = episode.displayTitle ||
                            ("Episode " + (episode.episodeNumber ?? "")).trim();
                          const airDate = episode.airedAt
                            ? new Date(episode.airedAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })
                            : null;
                          const detailText =
                            (airDate ? "Aired " + airDate : "Air date unavailable") +
                            (episode.runtimeMinutes ? " · " + episode.runtimeMinutes + " min" : "");

                          return (
                            <div
                              key={episode.id}
                              className={[styles.episodeRow, watched ? styles.watchedEpisode : ""].filter(Boolean).join(" ")}
                            >
                              <span className={styles.episodeStatus}>
                                {watched
                                  ? <CheckCircle2 size={14} />
                                  : <Circle size={14} />}
                              </span>
                              <span className={styles.episodeNumber}>{episodeLabel}</span>
                              <div className={styles.episodeCopy}>
                                <strong>{episodeTitle}</strong>
                                <span>{detailText}{watched && watchCount === 0 ? " · Watched, date unknown" : ""}</span>
                              </div>
                              <div className={styles.watchIndicator}>
                                {watched ? (
                                  watchCount > 1 ? (
                                    <span><RotateCcw size={12} />×{watchCount}</span>
                                  ) : null
                                ) : corrected ? <span title="Locally corrected">corrected</span> : null}
                                {numericTitleId && (watched ? (
                                  <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon-sm" className={styles.checkInButton}
                                        disabled={busy !== null} aria-label={"Episode actions: " + episodeTitle} title="Episode actions">
                                        <Ellipsis size={16} />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onSelect={() => void saveTracking("episode:" + episode.id, {
                                        action: "log", kind: "episode", titleId: numericTitleId,
                                        episodeId: episode.id, requestId: crypto.randomUUID(),
                                      })}>Log rewatch today</DropdownMenuItem>
                                      {latestManualEvent && <DropdownMenuItem onSelect={() => void saveTracking("episode:" + episode.id, {
                                        action: "moveEarlier", titleId: numericTitleId,
                                        episodeId: episode.id, eventId: latestManualEvent.id,
                                      })}>Move check-in to Earlier watches</DropdownMenuItem>}
                                      <DropdownMenuItem onSelect={() => void saveTracking("episode:" + episode.id, {
                                        action: "unwatch", titleId: numericTitleId, episodeId: episode.id,
                                      })}>Mark unwatched</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon-sm" className={styles.checkInButton}
                                        disabled={busy !== null} aria-label={"Mark watched: " + episodeTitle} title="Mark watched">
                                        <CheckCircle2 size={14} />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onSelect={() => void saveTracking("episode:" + episode.id, {
                                        action: "log", kind: "episode", titleId: numericTitleId,
                                        episodeId: episode.id, requestId: crypto.randomUUID(),
                                      })}>Watched today · sync with Trakt</DropdownMenuItem>
                                      <DropdownMenuItem onSelect={() => void saveTracking("episode:" + episode.id, {
                                        action: "markEarlier", titleId: numericTitleId, episodeId: episode.id,
                                      })}>Watched earlier · no date</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
            </>
          )}
        </section>
      )}
      </div>
      {trackingError&&!confirmation&&<p className={styles.trackingMessage} role="alert">{trackingError}</p>}
      {trackingMessage && <p className={styles.trackingMessage} role="status">{trackingMessage}</p>}
      <Dialog open={confirmation!==null} onOpenChange={open=>{if(!open&&busy===null){setConfirmation(null);setTrackingError("");}}}>
        <DialogContent onOpenAutoFocus={event=>{event.preventDefault();cancelRef.current?.focus();}}
          onCloseAutoFocus={event=>{event.preventDefault();triggerRef.current?.focus();}}
          onEscapeKeyDown={event=>{if(busy!==null)event.preventDefault();}}
          onPointerDownOutside={event=>{if(busy!==null)event.preventDefault();}}>
          <DialogHeader><DialogTitle>Mark episodes watched?</DialogTitle>
            <DialogDescription>{confirmation?.label}: mark {confirmation?.count} missing {confirmation?.count===1?"episode":"episodes"} watched in Marquee. {confirmation?.unknown ? confirmation.unknown+" have no known air date. " : ""}{catalogProgressMismatch ? `This count uses the episode catalog (${catalogReleasedCount} dated releases); the synced summary reports ${progress.released}. ` : ""}Future dated episodes are excluded. Existing watches keep their dates; new catch-up records have no watch date and add no Trakt plays. Undo remains available.</DialogDescription>
          </DialogHeader>
          {trackingError&&<p role="alert">{trackingError}</p>}
          <DialogFooter>
            <Button ref={cancelRef} variant="ghost" disabled={busy!==null} onClick={()=>{setConfirmation(null);setTrackingError("");}}>Cancel</Button>
            <Button disabled={busy!==null} aria-busy={busy!==null} onClick={async()=>{if(confirmation&&await saveTracking(confirmation.key,confirmation.change))setConfirmation(null);}}>{busy!==null?"Marking…":trackingError?"Retry":"Mark watched"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
