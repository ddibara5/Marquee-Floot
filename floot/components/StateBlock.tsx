import type { ReactNode } from "react";
import { CircleAlert, Inbox } from "lucide-react";
import { Button } from "./Button";
import styles from "./StateBlock.module.css";

type Props = { kind: "empty" | "error"; title: string; children?: ReactNode; onRetry?: () => void };

/** One shell for empty and error states (October 22 design pass). Errors always offer Retry when the caller can retry. */
export function StateBlock({ kind, title, children, onRetry }: Props) {
  const Icon = kind === "error" ? CircleAlert : Inbox;
  return <div className={styles.block} data-kind={kind} role={kind === "error" ? "alert" : undefined}>
    <Icon size={22} aria-hidden="true" className={styles.icon} />
    <strong>{title}</strong>
    {children && <div className={styles.body}>{children}</div>}
    {onRetry && <Button variant="outline" onClick={onRetry} className={styles.retry}>Retry</Button>}
  </div>;
}
