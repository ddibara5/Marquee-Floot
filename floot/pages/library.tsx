import {useRouteViewState} from "../helpers/useRouteViewState";
import {SearchField} from "../components/SearchField";
import {useSavedControl} from "../helpers/useSavedControl";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from "../components/Select";
import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, Clock3, PlayCircle, X } from "lucide-react";
import TitleCard from "../components/TitleCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/Accordion";
import { Skeleton } from "../components/Skeleton";
import { MediaImage } from "../components/MediaImage";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Popover, PopoverContent, PopoverTrigger } from "../components/Popover";
import type { HistoryEvent } from "../endpoints/watch-history_GET.schema";
import { filterAndSortTitles } from "../helpers/filterAndSortTitles";
import { tmdbImageUrl } from "../helpers/tmdbImageUrl";
import {useSearchTerm} from "../helpers/useSearchTerm";
import { useWatchHistory } from "../helpers/useWatchHistory";
import { useTitles } from "../helpers/useTitles";
import styles from "./library.module.css";

type Filter = "all" | "shows" | "movies" | "anime";
type WatchState = "all" | "in-progress" | "completed" | "unwatched";
type Sort = "recent" | "title" | "year" | "rating" | "progress";

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const [savedView,setSavedView]=useSavedControl<"titles"|"history">("marquee-library-view","history",["titles","history"]);
  const view=params.has("view")?(params.get("view")==="titles"?"titles":"history"):savedView;
  const [filter, setFilter] = useSavedControl<Filter>("marquee-library-filter","all",["all","shows","movies","anime"]);
  const [watchState, setWatchState] = useSavedControl<WatchState>("marquee-library-state","all",["all","in-progress","completed","unwatched"]);
  const [sort, setSort] = useSavedControl<Sort>("marquee-library-sort","recent",["recent","title","year","rating","progress"]);
  const [query, setQuery] = useRouteViewState("pages/library.tsx:query","");
  const [searchOpen, setSearchOpen] = useRouteViewState("pages/library.tsx:searchOpen",false);
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
  const days = useMemo(() => {
    const grouped = new Map<string, { key: string; date: Date; events: HistoryEvent[] }>();
    for (const event of events) {
      const date = new Date(event.watchedAt);
      if (!Number.isFinite(date.getTime())) continue;
      const key = dayKey(date);
      if (!grouped.has(key)) grouped.set(key, { key, date, events: [] });
      grouped.get(key)!.events.push(event);
    }
    return [...grouped.values()];
  }, [events]);
  const undated = history.data?.pages[0]?.undated ?? [];
  const loadingHistory = history.isFetching && !history.data;
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
        <div className={styles.toolbarActions}>
          <button type="button" className={styles.iconButton} aria-label={searchOpen ? "Close search" : "Search activity"}
            aria-expanded={searchOpen} onClick={() => setSearchOpen(current => !current)}>
            <Search size={18} aria-hidden="true" />{query && <span className={styles.activeDot} />}
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className={styles.iconButton} aria-label="Filter and sort activity">
                <SlidersHorizontal size={18} aria-hidden="true" />
                {(filter !== "all" || (view === "titles" && (watchState !== "all" || sort !== "recent"))) && <span className={styles.activeDot} />}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8} className={styles.filterPanel}>
              <strong>Media</strong>
              <div className={styles.filterChoices} role="group" aria-label="Media type">
                {(["all", "shows", "movies", "anime"] as const).map(value =>
                  <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>
                    {value === "all" ? "All" : value[0].toUpperCase() + value.slice(1)}
                  </button>)}
              </div>
              {view === "titles" && <>
                <strong>Watch state</strong>
                <div className={styles.filterChoices} role="group" aria-label="Watch state">
                  {(["all", "in-progress", "completed", "unwatched"] as const).map(value =>
                    <button type="button" key={value} aria-pressed={watchState === value} onClick={() => setWatchState(value)}>
                      {value === "all" ? "All" : value === "in-progress" ? "In progress" : value[0].toUpperCase() + value.slice(1)}
                    </button>)}
                </div>
                <label className={styles.sortLabel}>Sort titles
<Select value={sort} onValueChange={v=>setSort(v as Sort)}><SelectTrigger aria-label="Sort titles"><SelectValue>{{recent:"Recently watched",title:"Title A–Z",year:"Newest year",rating:"Highest rating",progress:"Most progress"}[sort]}</SelectValue></SelectTrigger><SelectContent><SelectItem value="recent">Recently watched</SelectItem><SelectItem value="title">Title A–Z</SelectItem><SelectItem value="year">Newest year</SelectItem><SelectItem value="rating">Highest rating</SelectItem><SelectItem value="progress">Most progress</SelectItem></SelectContent></Select>
                </label>
              </>}
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {(searchOpen || query) && <SearchField aria-label={view==="history"?"Search activity":"Search titles"} placeholder={view==="history"?"Search activity":"Search titles"} value={query} onValueChange={setQuery} onCompositionChange={setComposing}/>}

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
              {days.length ? <div className={styles.dayList}>
                {days.map(day => <section key={day.key} className={styles.daySection} aria-label={day.date.toLocaleDateString()}>
                  <div className={styles.dayHeading}>
                    <time dateTime={day.key}>{day.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</time>
                    <span>{day.events.length} {day.events.length === 1 ? "watch" : "watches"}</span>
                  </div>
                  <div className={styles.dayEvents}>
                    {day.events.map(event => {
                      const posterUrl = tmdbImageUrl(event.posterPath ?? undefined, "w185");
                      const episodeNumber = event.seasonNumber !== null && event.episodeNumber !== null
                        ? `S${event.seasonNumber} E${event.episodeNumber}` : null;
                      return <Link to={`/titles/${event.titleId}`} key={`${event.kind}-${event.eventId}`} data-restore-focus={`history-${event.kind}-${event.eventId}`} className={styles.historyRow}>
                        <span className={styles.historyPoster} aria-hidden="true">
                          <MediaImage src={posterUrl} fallback={event.title.slice(0, 1)} alt="" loading="lazy" decoding="async" />
                        </span>
                        <span className={styles.historyCopy}>
                          <strong>{event.title}</strong>
                          <small>{event.kind === "movie" ? "Movie watched" : [episodeNumber, event.episodeTitle].filter(Boolean).join(" · ") || "Episode watched"}</small>
                        </span>
                        <PlayCircle size={16} className={styles.historyIcon} aria-hidden="true" />
                      </Link>;
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
          <div className={styles.list}>{titles.map(t => <TitleCard key={t.id} title={t} compact />)}</div></>
        )
      )}
    </>
  );
}
