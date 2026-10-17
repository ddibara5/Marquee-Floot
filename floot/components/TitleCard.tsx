import { MediaImage } from "./MediaImage";
import { Link } from "react-router-dom";
import { PlayCircle, Star } from "lucide-react";
import type { Title } from "../helpers/Title";
import { tmdbImageUrl } from "../helpers/tmdbImageUrl";
import styles from "./TitleCard.module.css";

export default function TitleCard({ title, compact = false, className = "" }: { title: Title; compact?: boolean; className?: string }) {
  const watched = title.watchedEpisodes ?? 0;
  const released = title.releasedEpisodes ?? 0;
  const progress = released > 0 ? Math.min(100, Math.round((watched / released) * 100)) : undefined;
  const posterUrl = tmdbImageUrl(title.posterPath, "w342");

  return (
    <Link to={"/titles/" + title.id} className={[styles.card, compact ? styles.compact : "", className].filter(Boolean).join(" ")}>
      <div className={styles.poster} aria-hidden="true">
        {posterUrl ? (
          <MediaImage key={posterUrl} src={posterUrl} fallback={title.title.slice(0,1)} alt="" loading="lazy" decoding="async" />
        ) : (
          <span>{title.title.slice(0, 1)}</span>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.topline}>
          <h3>{title.title}</h3>
          {title.score !== undefined && <span className={styles.score}><Star size={13} fill="currentColor" />{title.score}</span>}
        </div>
        <p className={styles.meta}>
          {title.year ?? "—"} · {title.anime ? "Anime " : ""}{title.type === "show" ? "Series" : "Movie"}
        </p>
        {title.type === "show" && released > 0 && (
          <div className={styles.progressWrap}>
            <div className={styles.progressMeta}>
              <span><PlayCircle size={13} /> {watched} of {released}</span>
              <span>{progress}%</span>
            </div>
            <div className={styles.track}><span style={{ width: progress + "%" }} /></div>
          </div>
        )}
      </div>
    </Link>
  );
}
