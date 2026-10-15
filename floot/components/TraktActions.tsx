import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, Star, ChevronDown } from "lucide-react";
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuLabel,DropdownMenuRadioGroup,DropdownMenuRadioItem} from "./DropdownMenu";
import { Button } from "./Button";
import { changePersonalState } from "../endpoints/personal-state_POST.schema";
import { changeTracking } from "../endpoints/tracking_POST.schema";
import { usePersonalState } from "../helpers/usePersonalState";
import styles from "./TraktActions.module.css";

type Props = {
  titleId: number;
  statusLabel?: string;
  statusIcon?: ReactNode;
  displayRating?: number | null;
  localRating?: number | null;
  status?: string | null;
  statusDisabled?: boolean;
  onStatusChange: (value: "paused" | "dropped" | null) => void;
};

export default function TraktActions({
  titleId, localRating, status, statusDisabled, onStatusChange, statusLabel, statusIcon, displayRating,
}: Props) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = usePersonalState();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const mapped = data?.mappings.find(row => row.titleId === titleId);
  const saved = data?.watchlist.some(row => row.titleId === titleId) ?? false;
  const rating = data?.ratings.find(row => row.titleId === titleId);
  const statusValue = status === "paused" || status === "dropped" ? status : undefined;
  const ratingValue = rating?.pendingAction === "remove" ? null : (mapped ? rating?.rating ?? displayRating : localRating ?? displayRating);

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

  const saveRating = async (value: string) => {
    setBusy(true);
    setMessage("");
    try {
      if (mapped) {
        const result = await changePersonalState({
          kind: "rating", mediaType: mapped.mediaType as "movie" | "show",
          traktId: mapped.traktId, action: value === "none" ? "remove" : "set",
          rating: value === "none" ? undefined : Number(value),
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["marquee", "personal-state"] }),
          queryClient.invalidateQueries({ queryKey: ["marquee", "trakt-status"] }),
          queryClient.invalidateQueries({ queryKey: ["marquee", "insights-context"] }),
        ]);
        setMessage(result.synced ? "Synced with Trakt." : "Saved. Trakt sync pending.");
      } else {
        await changeTracking({
          action: "rating", titleId, rating: value === "none" ? null : Number(value),
        });
        await queryClient.invalidateQueries({ queryKey: ["marquee", "title-episodes", titleId] });
        await queryClient.invalidateQueries({ queryKey: ["marquee", "insights-context"] });
        setMessage("Rating updated.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save rating.");
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
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className={styles.chip} aria-label="Your rating" disabled={busy||statusDisabled||isLoading||Boolean(error)}><Star size={15} fill={ratingValue?"currentColor":"none"}/>{ratingValue??"Rate"}<ChevronDown size={13}/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Your rating</DropdownMenuLabel><DropdownMenuRadioGroup value={ratingValue?String(ratingValue):"none"} onValueChange={v=>void saveRating(v)}><DropdownMenuRadioItem value="none">No rating</DropdownMenuRadioItem>{Array.from({length:10},(_,i)=><DropdownMenuRadioItem key={i+1} value={String(i+1)}>{i+1}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
      <Button variant="ghost" className={styles.bookmark} data-saved={saved} aria-label={saved?"Remove from Watch List":"Add to Watch List"} aria-pressed={saved} title={saved?"Remove from Watch List":"Add to Watch List"} disabled={busy||statusDisabled||isLoading||Boolean(error)} onClick={()=>void toggleWatchlist()}><Bookmark size={18} fill={saved?"currentColor":"none"}/></Button>
    </div>
    {error&&<p className={styles.note} role="alert">Watch List and Trakt ratings are temporarily unavailable.</p>}
    {message&&<p className={styles.note} role="status">{message}</p>}
  </div>;
}
