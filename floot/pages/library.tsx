import {useRouteViewState} from "../helpers/useRouteViewState";
import {SearchField} from "../components/SearchField";
import {useSavedControl} from "../helpers/useSavedControl";
import { Fragment, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Clock3, PlayCircle } from "lucide-react";
import TitleCard from "../components/TitleCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/Accordion";
import { Skeleton } from "../components/Skeleton";
import { MediaImage } from "../components/MediaImage";
import { Button } from "../components/Button";
import { OptionChoice, OptionsSheet } from "../components/OptionsSheet";
import { describeGroup, groupActivity } from "../helpers/groupActivity";
import { filterAndSortTitles } from "../helpers/filterAndSortTitles";
import { tmdbImageUrl } from "../helpers/tmdbImageUrl";
import {useSearchTerm} from "../helpers/useSearchTerm";
import { useWatchHistory } from "../helpers/useWatchHistory";
import { useTitles } from "../helpers/useTitles";
import styles from "./library.module.css";

type Filter = "all" | "shows" | "movies" | "anime";
type WatchState = "all" | "in-progress" | "completed" | "unwatched";
type Sort = "recent" | "title" | "year" | "rating" | "progress";

const MEDIA = [["all", "All"], ["shows", "Series"], ["movies", "Movies"], ["anime", "Anime"]] as const;
const STATES = [["all", "All"], ["in-progress", "Watching"], ["completed", "Caught up"], ["unwatched", "Not started"]] as const;
const SORTS = [["recent", "Recently watched"], ["title", "A to Z"], ["year", "Newest"], ["rating", "Highest rated"], ["progress", "Most progress"]] as const;
const PAGE = 48;


export default function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const [savedView,setSavedView]=useSavedControl<"titles"|"history">("marquee-library-view","history",["titles","history"]);
  const view=params.has("view")?(params.get("view")==="titles"?"titles":"history"):savedView;
  const [filter, setFilter] = useSavedControl<Filter>("marquee-library-filter","all",["all","shows","movies","anime"]);
  const [watchState, setWatchState] = useSavedControl<WatchState>("marquee-library-state","all",["all","in-progress","completed","unwatched"]);
  const [sort, setSort] = useSavedControl<Sort>("marquee-library-sort","recent",["recent","title","year","rating","progress"]);
  const [query, setQuery] = useRouteViewState("pages/library.tsx:query","");
  const [shown, setShown] = useRouteViewState("pages/library.tsx:titlesShown", PAGE);
  const [expanded, setExpanded] = useRouteViewState<string[]>("pages/library.tsx:expandedGroups", []);
  const [undatedVisible, setUndatedVisible] = useRouteViewState("pages/library.tsx:undatedVisible",12);
  const [composing,setComposing]=useState(false);
  const debouncedQuery = useSearchTerm(query,composing);
  const { data: allTitles = [], isFetching: titlesFetching, error: titlesError, refetch: refetchTitles } = useTitles(view === "titles");
  const history = useWatchHistory(view === "history", filter, debouncedQuery);
  const titles = useMemo(
    () => filterAndSortTitles(allTitles, { filter, watchState, sort, query }),
    [allTitles, filter, watchState, sort, query]
  );
  const events = useMemo(
    () => history.data?.pages.flatMap(page => page.events) ?? [],
    [history.data]
  );
  const periods = useMemo(() => groupActivity(events, new Date()), [events]);
  const undated = history.data?.pages[0]?.undated ?? [];
  const loadingHistory = history.isFetching && !history.data;
  const titlesView = view === "titles";
  const activeCount = Number(filter !== "all") + Number(titlesView && watchState !== "all");
  const canReset = activeCount > 0 || (titlesView && sort !== "recent");
  const resetOptions = () => { setFilter("all"); setWatchState("all"); setSort("recent"); };
  const filterText = [titlesView && watchState !== "all" ? STATES.find(([v]) => v === watchState)![1] : null,
    filter !== "all" ? MEDIA.find(([v]) => v === filter)![1] : null].filter(Boolean).join(" · ");
  const switchView = (next: string) => {
    setSavedView(next==="titles"?"titles":"history");
    setParams(previous => {
      const updated = new URLSearchParams(previous);
      if (next === "titles") updated.set("view", "titles");
      else updated.delete("view");
      return updated;
    });
  };

  return (
    <>
      <Helmet><title>{view === "history" ? "Activity" : "Titles"} · Marquee</title></Helmet>
      <div className={styles.toolbar}>
        <div className={styles.viewTabs} role="group" aria-label="Activity view">
          <button type="button" aria-pressed={view === "history"} onClick={() => switchView("history")}>Activity</button>
          <button type="button" aria-pressed={view === "titles"} onClick={() => switchView("titles")}>Titles</button>
        </div>
      </div>
      {/* Batch C (October 17): search always visible, filters and sorting in one Options sheet, GameDeck's Library pattern. */}
      <div className={styles.searchRow}>
        <SearchField aria-label={titlesView ? "Search titles" : "Search activity"} placeholder={titlesView ? "Search titles" : "Search activity"} value={query} onValueChange={setQuery} onCompositionChange={setComposing}/>
        <OptionsSheet label={titlesView ? "Title options" : "Activity options"} activeCount={activeCount} canReset={canReset} onReset={resetOptions}
          doneLabel={titlesView ? `Show ${titles.length} ${titles.length === 1 ? "title" : "titles"}` : "Done"}>
          <OptionChoice label="Media type" value={filter} options={MEDIA} onChange={setFilter}/>
          {titlesView && <>
            <OptionChoice label="Status" value={watchState} options={STATES} onChange={setWatchState}/>
            <OptionChoice label="Sort by" value={sort} options={SORTS} onChange={setSort}/>
          </>}
        </OptionsSheet>
      </div>
      {activeCount > 0 && <div className={styles.filterSummary}>
        <span>{titlesView && <strong>{titles.length} {titles.length === 1 ? "title" : "titles"} · </strong>}{filterText}</span>
        <button type="button" onClick={resetOptions}>Clear filters</button>
      </div>}

      {view === "history" ? (
        <div className={styles.history}>
          {loadingHistory ? (
            <div className={styles.historySkeleton} aria-busy="true">{[0, 1, 2].map(day =>
              <div key={day}><Skeleton className={styles.daySkeleton}/><Skeleton className={styles.rowSkeleton}/></div>)}</div>
          ) : history.error && !history.data ? (
            <p className={styles.error} role="alert">Unable to load activity. <Button variant="ghost" onClick={()=>void history.refetch()}>Retry</Button></p>
          ) : (
            <>
              {history.error && <p role="alert" className={styles.error}>Couldn’t refresh Activity. Showing saved data.</p>}
              {periods.length ? <div className={styles.dayList}>
                {/* Batch C (October 17): one row per title per week or month, like GameDeck's Activity; a run of episodes opens to its rows. */}
                {periods.map(period => <section key={period.key} className={styles.daySection} aria-label={period.label}>
                  <div className={styles.dayHeading}>
                    <h2 className={styles.periodLabel}>{period.label}</h2>
                    <span>{period.count} {period.count === 1 ? "watch" : "watches"}</span>
                  </div>
                  <div className={styles.dayEvents}>
                    {period.groups.map(group => {
                      const open = expanded.includes(group.key);
                      const toggle = () => setExpanded(current => open ? current.filter(key => key !== group.key) : [...current, group.key]);
                      return <Fragment key={group.key}>
                        <Link to={`/titles/${group.titleId}`} data-restore-focus={`history-group-${group.key}`} className={styles.historyRow}>
                          <span className={styles.historyPoster} aria-hidden="true">
                            <MediaImage src={tmdbImageUrl(group.posterPath ?? undefined, "w185")} fallback={group.title.slice(0, 1)} alt="" loading="lazy" decoding="async" />
                          </span>
                          <span className={styles.historyCopy}>
                            <strong>{group.title}</strong>
                            <small>{describeGroup(group)}</small>
                          </span>
                          <PlayCircle size={16} className={styles.historyIcon} aria-hidden="true" />
                        </Link>
                        {group.events.length > 1 && group.kind === "episode" && <>
                          <button type="button" className={styles.groupToggle} aria-expanded={open} onClick={toggle}>
                            {open ? "Hide" : "Show"} the {group.events.length} episodes
                          </button>
                          {open && <div className={styles.groupEvents}>
                            {group.events.map(event => <Link to={`/titles/${event.titleId}`} key={event.eventId} data-restore-focus={`history-${event.kind}-${event.eventId}`} className={styles.groupEvent}>
                              <span>{[event.seasonNumber !== null && event.episodeNumber !== null ? `S${event.seasonNumber} E${event.episodeNumber}` : null, event.episodeTitle].filter(Boolean).join(" · ") || "Episode watched"}</span>
                              <time dateTime={new Date(event.watchedAt).toISOString()}>{new Date(event.watchedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time>
                            </Link>)}
                          </div>}
                        </>}
                      </Fragment>;
                    })}
                  </div>
                </section>)}
              </div> : (
                <div className={styles.empty}><Clock3 size={18} /><strong>No dated watches found</strong><span>Try another search or media filter.</span></div>
              )}
              {history.isFetchNextPageError && <p className={styles.error}>Couldn’t load older watches. Try again below.</p>}
              {history.hasNextPage && <Button variant="outline" className={styles.loadMore} disabled={history.isFetchingNextPage}
                onClick={() => void history.fetchNextPage()}>
                {history.isFetchingNextPage ? "Loading…" : "Load older watches"}
              </Button>}
              {undated.length > 0 && <Accordion type="single" collapsible className={styles.undatedAccordion}>
                <AccordionItem value="undated" className={styles.undatedPanel}>
                  <AccordionTrigger className={styles.undatedTrigger}>
                    <span><strong>Earlier watches</strong><small>Dates unknown · {undated.length} titles</small></span>
                  </AccordionTrigger>
                  <AccordionContent className={styles.undatedContent}>
                    <p>Historical completions without a reliable watch date.</p>
                    <div className={styles.undatedList}>
                      {undated.slice(0, undatedVisible).map(title => {
                        const posterUrl = tmdbImageUrl(title.posterPath ?? undefined, "w185");
                        return <Link key={title.titleId} to={`/titles/${title.titleId}`} className={styles.undatedRow}>
                          <span className={styles.undatedPoster} aria-hidden="true">
                            <MediaImage src={posterUrl} fallback={title.title.slice(0, 1)} alt="" loading="lazy" decoding="async" />
                          </span>
                          <span><strong>{title.title}</strong><small>{title.mediaType === "show" ? `${title.count} ${title.count === 1 ? "episode" : "episodes"} watched` : "Movie watched"} · date unknown</small></span>
                        </Link>;
                      })}
                    </div>
                    {undatedVisible < undated.length && <Button variant="ghost" size="sm" className={styles.showMore}
                      onClick={() => setUndatedVisible(current => current + 12)}>
                      Show more
                    </Button>}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>}
            </>
          )}
        </div>
      ) : (
        titlesFetching && allTitles.length === 0 ? (
          <div className={styles.list} aria-busy="true">{[0, 1, 2, 3].map(tile => <Skeleton key={tile} className={styles.posterSkeleton}/>)}</div>
        ) : titlesError && !allTitles.length ? (
          <p className={styles.error} role="alert">Unable to load titles. <Button variant="ghost" onClick={()=>void refetchTitles()}>Retry</Button></p>
        ) : titles.length === 0 ? (
          <div className={styles.empty}><Search size={18} /><strong>No titles match</strong><span>Adjust your search or filters.</span></div>
        ) : (
          <>{titlesError && <p role="alert" className={styles.error}>Couldn’t refresh titles. Showing saved data.</p>}
          <div className={styles.list}>{titles.slice(0, shown).map(t => <TitleCard key={t.id} title={t} compact />)}</div>
          {shown < titles.length && <Button variant="outline" className={styles.loadMore} onClick={() => setShown(current => current + PAGE)}>
            Show {Math.min(PAGE, titles.length - shown)} more
          </Button>}</>
        )
      )}
    </>
  );
}
