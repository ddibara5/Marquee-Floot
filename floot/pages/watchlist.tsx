import {useRouteViewState} from "../helpers/useRouteViewState";
import {SearchField} from "../components/SearchField";
import { useSavedControl } from "../helpers/useSavedControl";
import { useEnhancementPreferences } from "../helpers/useEnhancementPreferences";
import { useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { SlidersHorizontal, X, Bookmark, ChevronRight, Ellipsis, Film, Grid2X2, List, Search, Tv2 } from "lucide-react";
import {Popover,PopoverContent,PopoverTrigger} from "../components/Popover";
import { Button } from "../components/Button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/DropdownMenu";
import { Input } from "../components/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { Skeleton } from "../components/Skeleton";
import { MediaImage } from "../components/MediaImage";
import { changePersonalState } from "../endpoints/personal-state_POST.schema";
import { changeTracking } from "../endpoints/tracking_POST.schema";
import type { PersonalRow } from "../endpoints/personal-state_GET.schema";
import { usePersonalState } from "../helpers/usePersonalState";
import { tmdbImageUrl } from "../helpers/tmdbImageUrl";
import { DubBadge } from "../components/DubBadge";
import { useDubStatus } from "../helpers/useDubStatus";
import styles from "./watchlist.module.css";

type Filter = "all" | "movie" | "show" | "anime";
type Sort = "added" | "title" | "release";
type View = "list" | "grid";
const dateLabel = (value?: Date | null) =>
  value ? new Date(value).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}) : null;

function Poster({row}: {row:PersonalRow}) {
  const src = tmdbImageUrl(row.posterPath ?? undefined, "w342");
  return <span className={styles.poster} aria-hidden="true"><span>{row.title.slice(0,1)}</span>
    <MediaImage src={src} fallback="" alt="" loading="lazy" decoding="async"/>
  </span>;
}

export default function WatchlistPage() {
  const [filter,setFilter] = useSavedControl<Filter>("marquee-watchlist-filter","all",["all","movie","show","anime"]);
  const [sort,setSort] = useSavedControl<Sort>("marquee-watchlist-sort","added",["added","title","release"]);
  const [view,setView] = useRouteViewState<View>("watchlist-view",() => {
    try { return localStorage.getItem("marquee-watchlist-view") === "grid" ? "grid" : "list"; }
    catch { return "list"; }
  });
  const preferences=useEnhancementPreferences();
  const [scope,setScope]=useSavedControl<"all"|"available"|"upcoming"|"unknown">("marquee-watchlist-scope","all",["all","available","upcoming","unknown"]);
  const availability=(row:PersonalRow)=>!row.releaseDate?"unknown":new Date(row.releaseDate).getTime()>Date.now()?"upcoming":"available";
  const [searchOpen,setSearchOpen]=useRouteViewState("pages/watchlist.tsx:searchOpen",false);
  const [search,setSearch] = useRouteViewState("pages/watchlist.tsx:search","");
  const [busy,setBusy] = useState<string|null>(null);
  const [removed,setRemoved] = useState<PersonalRow|null>(null);
  const [message,setMessage] = useState("");
  const [actionError,setActionError]=useState("");
  const [failedAction,setFailedAction]=useState<{row:PersonalRow;action:"add"|"remove"}|null>(null);
  const {data,isLoading,error,refetch} = usePersonalState();
  const dubs = useDubStatus().data;
  const queryClient = useQueryClient();
  const all = data?.watchlist ?? [];
  const counts:Record<Filter,number> = {
    all:all.length, movie:all.filter(row => row.mediaType === "movie" && !row.isAnime).length,
    show:all.filter(row => row.mediaType === "show" && !row.isAnime).length,
    anime:all.filter(row => row.isAnime).length,
  };
  const normalized = search.trim().toLocaleLowerCase();
  const rows = all.filter(row => {
    const type = filter === "all" || (filter === "anime" ? row.isAnime :
      row.mediaType === filter && !row.isAnime);
    return type && (scope==="all"||availability(row)===scope) && (!normalized || row.title.toLocaleLowerCase().includes(normalized));
  }).sort((a,b) => sort === "title" ? a.title.localeCompare(b.title) :
    sort === "release" ? (new Date(b.releaseDate ?? 0).getTime() - new Date(a.releaseDate ?? 0).getTime()) ||
      (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title) :
      new Date(b.activityAt ?? 0).getTime() - new Date(a.activityAt ?? 0).getTime());

  const change = async (row:PersonalRow, action:"add"|"remove") => {
    const key = row.mediaType + ":" + row.traktId;
    if(busy!==null)return;
    setBusy(key); setMessage(""); setActionError(""); setFailedAction(null);
    try {
      const mapping = data?.mappings.find(item => item.titleId === row.titleId && item.mediaType === row.mediaType);
      const result = row.source === "local" && !mapping && row.titleId
        ? await changeTracking({action:"watchlistLocal",titleId:row.titleId,saved:action === "add"})
        : await changePersonalState({
          kind:"watchlist", mediaType:row.mediaType as "movie"|"show",
          traktId:mapping?.traktId ?? row.traktId, action,
        });
      setRemoved(action === "remove" ? row : null);
      setMessage(result.synced ? "Synced with Trakt." : result.message ?? "Saved.");
      await queryClient.invalidateQueries({queryKey:["marquee","personal-state"]});
      await queryClient.invalidateQueries({queryKey:["marquee","trakt-status"]});
    } catch(err) { setActionError(err instanceof Error ? err.message : "Unable to save."); setFailedAction({row,action}); }
    finally { setBusy(null); }
  };

  // Grid (October 15): the soonest dated release leads the page, like GameDeck's Wishlist countdown.
  const todayKey = new Date().toLocaleDateString("en-CA");
  const releaseDays = (row:PersonalRow) => Math.round((Date.parse(new Date(row.releaseDate!).toISOString().slice(0,10)) - Date.parse(todayKey)) / 86400000);
  const nextRelease = all.filter(row => row.releaseDate && releaseDays(row) > 0).sort((a,b) => releaseDays(a) - releaseDays(b))[0];
  const nextDays = nextRelease ? releaseDays(nextRelease) : 0;
  const nextWhen = nextRelease ? new Date(nextRelease.releaseDate!).toLocaleDateString(undefined,{month:"short",day:"numeric",timeZone:"UTC"}) : "";

  const setDisplay = (next:View) => {
    setView(next);
    try { localStorage.setItem("marquee-watchlist-view",next); } catch {}
  };

  return <>
    <Helmet><title>Watch List · Marquee</title></Helmet>
    <div className={styles.toolbar}>
      <div className={styles.viewSwitch} role="group" aria-label="Display Watch List">
          <button type="button" aria-label="List view" aria-pressed={view === "list"}
            className={view === "list" ? styles.activeView : ""} onClick={() => setDisplay("list")}><List size={17}/></button>
          <button type="button" aria-label="Grid view" aria-pressed={view === "grid"}
            className={view === "grid" ? styles.activeView : ""} onClick={() => setDisplay("grid")}><Grid2X2 size={17}/></button>
        </div>
      <div className={styles.toolbarActions}><Button variant="ghost" size="icon" aria-label="Search Watch List" aria-expanded={searchOpen} onClick={()=>setSearchOpen(v=>!v)}><Search size={18}/></Button>
      <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" aria-label="Filter and sort Watch List"><SlidersHorizontal size={18}/>{(filter!=="all"||scope!=="all"||sort!=="added")&&<span className={styles.activeDot}/>}</Button></PopoverTrigger><PopoverContent align="end" className={styles.filterPanel}><strong>Media</strong>      <div className={styles.filterBar} role="group" aria-label="Filter Watch List">
        {([["all","All"],["movie","Movies"],["show","Series"],["anime","Anime"]] as const).map(([value,label]) =>
          <button key={value} type="button" className={filter === value ? styles.selectedFilter : styles.filter}
            aria-pressed={filter === value} onClick={() => setFilter(value)}>{label} <span>{counts[value]}</span></button>)}
      </div>
<strong>Release and sort</strong>        <Select value={scope} onValueChange={v=>setScope(v as typeof scope)}><SelectTrigger aria-label="Release availability"><SelectValue>{{all:"All releases",available:"Released",upcoming:"Upcoming",unknown:"Date unknown"}[scope]}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">All releases</SelectItem><SelectItem value="available">Released</SelectItem><SelectItem value="upcoming">Upcoming</SelectItem><SelectItem value="unknown">Date unknown</SelectItem></SelectContent></Select>
        <Select value={sort} onValueChange={value => setSort(value as Sort)}>
          <SelectTrigger className={styles.sort} aria-label="Sort Watch List"><SelectValue>{{added:"Recently added",title:"Title A–Z",release:"Release date"}[sort]}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="added">Recently added</SelectItem>
            <SelectItem value="title">Title A–Z</SelectItem>
            <SelectItem value="release">Release date</SelectItem>
          </SelectContent>
        </Select>
</PopoverContent></Popover></div>
    </div>
    {(searchOpen||search)&&<SearchField value={search} onValueChange={setSearch} placeholder="Search your Watch List" aria-label="Search your Watch List"/>}
    {actionError && <div className={styles.notice} role="alert"><span>{actionError}</span>{failedAction&&<button type="button" disabled={busy!==null} onClick={()=>void change(failedAction.row,failedAction.action)}>Retry {failedAction.action==="add"?"Undo":"save"}</button>}</div>}
    {(message || removed) && <div className={styles.notice} role="status">
      <span>{removed ? removed.title + " removed from your Watch List." : message}</span>
      {removed && <button type="button" disabled={busy !== null} onClick={() => void change(removed,"add")}>Undo</button>}
      {removed && <button type="button" aria-label="Dismiss notice" onClick={() => {setRemoved(null);setMessage("");}}>×</button>}
    </div>}
    {error && data && <p className={styles.empty} role="alert">Couldn’t refresh Watch List. Showing saved data. <Button variant="ghost" onClick={()=>void refetch()}>Retry</Button></p>}
    {!isLoading && !normalized && nextRelease && (() => {
      const body = <><Poster row={nextRelease}/><span className={styles.nextCopy}><small>Next release</small>
        <strong>{nextDays === 1 ? "Tomorrow" : nextDays + " days"}</strong><span>{nextRelease.title} · {nextWhen}</span></span></>;
      return nextRelease.titleId
        ? <Link className={styles.nextRelease} to={"/titles/" + nextRelease.titleId} aria-label={"Next release: " + nextRelease.title + ", " + nextWhen}>{body}</Link>
        : <div className={styles.nextRelease}>{body}</div>;
    })()}
    {isLoading ? <div className={styles.list} aria-busy="true">{[0, 1, 2].map(row => <Skeleton key={row} style={{height:132, margin:"8px 0"}}/>)}</div>
      : error && !data ? <p className={styles.empty} role="alert">Unable to load your Watch List. <Button variant="ghost" onClick={()=>void refetch()}>Retry</Button></p>
      : !all.length ? <div className={styles.emptyState}><Bookmark size={28}/><h3>Your Watch List is empty</h3><p>Save a title here or in Rippple to start a queue.</p><Link to="/library?view=titles">Browse titles <ChevronRight size={16}/></Link></div>
      : !rows.length ? <p className={styles.empty}>No titles match these filters.</p>
      : <div className={view === "grid" ? styles.grid : styles.list}>{rows.map(row => {
        const key = row.mediaType + ":" + row.traktId;
        const date = dateLabel(row.activityAt);
        const upcoming = row.releaseDate &&
          new Date(row.releaseDate).getTime() > Date.now();
        const picked = preferences.data?.["pick-next"]?.key === key;
        const togglePick = async () => { setBusy(key); try { await preferences.save({action:"pick",key:picked?null:key}); setMessage(picked?"Pick next cleared.":"Pick next saved."); } catch(e) { setMessage(e instanceof Error?e.message:"Unable to save"); } finally { setBusy(null); } };
        return <article key={key} className={styles.row}>
          {row.titleId ? <Link to={"/titles/" + row.titleId} className={styles.posterLink} aria-label={"View " + row.title}><Poster row={row}/></Link>
            : <span className={styles.posterLink}><Poster row={row}/></span>}
          <div className={styles.copy}>
            {row.titleId ? <Link className={styles.title} to={"/titles/" + row.titleId}>{row.title}</Link>
              : <strong className={styles.title}>{row.title}</strong>}
            <div className={styles.metadata}>
              <span>{row.mediaType === "show" ? <Tv2 size={13}/> : <Film size={13}/>} {row.isAnime ? "Anime" : row.mediaType === "show" ? "Series" : "Movie"}</span>
              <span>{row.year ?? "Year unknown"}</span>
              {upcoming && <span className={styles.upcoming}>Coming {dateLabel(row.releaseDate)}</span>}
              {picked && <span className={styles.upcoming}>★ Pick next</span>}
              {row.titleId !== null && <DubBadge hasEnDub={dubs?.get(row.titleId)}/>}
            </div>
            {row.overview && <p className={styles.overview}>{row.overview}</p>}
            <div className={styles.footer}>
              {!row.releaseDate&&<span>Release date unknown</span>}
              <span>{date ? "Added " + date : "Saved to Watch List"}</span>
              {row.pendingAction && <span className={styles.pending}>Sync pending</span>}
              {!row.posterPath && <span>{row.tmdbId || row.titleId ? "Artwork pending" : "Artwork unavailable"}</span>}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className={styles.more}
              aria-label={"Actions for " + row.title} disabled={busy === key}><Ellipsis size={19}/></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {row.titleId && <DropdownMenuItem asChild><Link to={"/titles/" + row.titleId}>View details</Link></DropdownMenuItem>}
              <DropdownMenuItem disabled={busy!==null||preferences.isPending} onSelect={() => void togglePick()}>{picked ? "Clear Pick next" : "Set as Pick next"}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void change(row,"remove")}>Remove from Watch List</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {row.titleId && <Link className={styles.chevron} to={"/titles/" + row.titleId} aria-label={"View " + row.title + " details"}><ChevronRight size={18}/></Link>}
        </article>;
      })}</div>}
  </>;
}
