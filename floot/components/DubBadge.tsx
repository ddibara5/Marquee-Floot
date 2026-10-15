import styles from "./DubBadge.module.css";

/** "English dub" or "Sub only" for Crunchyroll anime; nothing when unknown. `overlay` sits on a poster corner. */
export function DubBadge({ hasEnDub, overlay = false }: { hasEnDub?: boolean; overlay?: boolean }) {
  if (hasEnDub === undefined) return null;
  return <span className={styles.badge} data-dub={hasEnDub || undefined} data-overlay={overlay || undefined}>
    {hasEnDub ? "English dub" : "Sub only"}
  </span>;
}
