import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, Star, ChevronDown } from "lucide-react";
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuLabel,DropdownMenuRadioGroup,DropdownMenuRadioItem} from "./DropdownMenu";
import { Button } from "./Button";
import RateSheet from "./RateSheet";
import { changePersonalState } from "../endpoints/personal-state_POST.schema";
import { changeTracking } from "../endpoints/tracking_POST.schema";
import { usePersonalState } from "../helpers/usePersonalState";
import { ratingText } from "../helpers/titleRatings";
import styles from "./TraktActions.module.css";

type Props = {
  titleId: number;
  title: string;
  posterPath?: string | null;
  statusLabel?: string;
  statusIcon?: ReactNode;
  displayRating?: number | null;
  localRating?: number | null;
  status?: string | null;
  statusDisabled?: boolean;
  onStatusChange: (value: "paused" | "dropped" | null) => void;
};

export default function TraktActions({
  titleId, title, posterPath, localRating, status, statusDisabled, onStatusChange, statusLabel, statusIcon, displayRating,
}: Props) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = usePersonalState();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [rateOpen, setRateOpen] = useState(false);
  const mapped = data?.mappings.find(row => row.titleId === titleId);
  const saved = data?.watchlist.some(row => row.titleId === titleId) ?? false;
  const rating = data?.ratings.find(row => row.titleId === titleId);
  const statusValue = status === "paused" || status === "dropped" ? status : undefined;
  const ratingValue = (rating?.pendingAction === "remove" ? null : (mapped ? rating?.rating ?? displayRating : localRating ?? displayRating)) ?? null;

  const toggleWatchlist = async () => {
    if (!data || error) return;
    setBusy(true);
    setMessage("");
    try {
      if (mapped) {
        const result = await changePersonalState({
          kind: "watchlist", mediaType: mapped.mediaType as "movie" | "show",
          traktId: mapped.traktId, action: saved ? "remove" : "add",
        });
        setMessage(result.synced ? "Synced with Trakt." : "Watch List saved. Trakt sync pending.");
      } else {
        const result = await changeTracking({ action: "watchlistLocal", titleId, saved: !saved });
        setMessage(result.message ?? "Watch List updated in Marquee.");
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["marquee", "personal-state"] }),
        queryClient.invalidateQueries({ queryKey: ["marquee", "trakt-status"] }),
      ]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update Watch List.");
    } finally {
      setBusy(false);
    }
  };

  // Errors reach the rating sheet, which keeps itself open and shows them.
  const saveRating = async (score: number | null) => {
    setBusy(true);
    setMessage("");
    try {
      if (mapped) {
        const result = await changePersonalState({
          kind: "rating", mediaType: mapped.mediaType as "movie" | "show",
          traktId: mapped.traktId, action: score === null ? "remove" : "set",
          rating: score ?? undefined,
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["marquee", "personal-state"] }),
          queryClient.invalidateQueries({ queryKey: ["marquee", "trakt-status"] }),
          queryClient.invalidateQueries({ queryKey: ["marquee", "insights-context"] }),
        ]);
        setMessage(result.synced ? "Synced with Trakt." : "Saved. Trakt sync pending.");
      } else {
        await changeTracking({
          action: "rating", titleId, rating: score,
        });
        await queryClient.invalidateQueries({ queryKey: ["marquee", "title-episodes", titleId] });
        await queryClient.invalidateQueries({ queryKey: ["marquee", "insights-context"] });
        setMessage("Rating updated.");
      }
    } finally {
      setBusy(false);
    }
  };

  return <div className={styles.inline} aria-label="Your title controls">
    <div className={styles.actions}>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className={styles.chip} aria-label={"Change status, currently "+(statusLabel??statusValue??"Unwatched")} disabled={busy||statusDisabled}>{statusIcon}{statusLabel??statusValue??"Unwatched"}<ChevronDown size={13}/></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="start"><DropdownMenuLabel>Your status</DropdownMenuLabel><DropdownMenuRadioGroup value={statusValue??"calculated"} onValueChange={v=>onStatusChange(v==="calculated"?null:v as "paused"|"dropped")}>
          <DropdownMenuRadioItem value="calculated">Use calculated status</DropdownMenuRadioItem><DropdownMenuRadioItem value="paused">Paused</DropdownMenuRadioItem><DropdownMenuRadioItem value="dropped">Dropped</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup></DropdownMenuContent>
      </DropdownMenu>
      <Button variant="ghost" className={styles.chip} data-rated={ratingValue!=null||undefined} aria-label={ratingValue!=null?"Your rating, "+ratingText(ratingValue)+" out of 10":"Rate this title"} aria-haspopup="dialog" disabled={busy||statusDisabled||isLoading||Boolean(error)} onClick={()=>setRateOpen(true)}><Star size={15} fill={ratingValue!=null?"currentColor":"none"}/>{ratingValue!=null?ratingText(ratingValue):"Rate"}</Button>
      <Button variant="ghost" className={styles.bookmark} data-saved={saved} aria-label={saved?"Remove from Watch List":"Add to Watch List"} aria-pressed={saved} title={saved?"Remove from Watch List":"Add to Watch List"} disabled={busy||statusDisabled||isLoading||Boolean(error)} onClick={()=>void toggleWatchlist()}><Bookmark size={18} fill={saved?"currentColor":"none"}/></Button>
    </div>
    <RateSheet open={rateOpen} onOpenChange={setRateOpen} title={title} posterPath={posterPath} current={ratingValue} onSave={saveRating} />
    {error&&<p className={styles.note} role="alert">Watch List and Trakt ratings are temporarily unavailable.</p>}
    {message&&<p className={styles.note} role="status">{message}</p>}
  </div>;
}
