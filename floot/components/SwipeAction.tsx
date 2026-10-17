import { useRef, useState, type MouseEvent, type ReactNode, type PointerEvent } from "react";
import styles from "./SwipeAction.module.css";

const WIDTH = 96;

/** Swipe a row left on touch to reveal one action, like GameDeck's iOS lists (October 17, Batch C).
 *  Touch only: mouse and keyboard users keep the row's own menu for the same action. */
export function SwipeAction({ actionLabel, onAction, disabled, children }: {
  actionLabel: string; onAction: () => void; disabled?: boolean; children: ReactNode;
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; base: number; moving: boolean; moved: boolean } | null>(null);
  const open = offset <= -WIDTH / 2;

  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" || disabled) return;
    drag.current = { x: event.clientX, y: event.clientY, base: offset, moving: false, moved: false };
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current; if (!d) return;
    const dx = event.clientX - d.x, dy = event.clientY - d.y;
    if (!d.moving) {
      if (Math.abs(dy) > 10) { drag.current = null; return; } // a scroll, not a swipe
      if (Math.abs(dx) < 10) return;
      d.moving = d.moved = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setOffset(Math.max(-WIDTH, Math.min(0, d.base + dx)));
  };
  const up = () => {
    const d = drag.current; if (!d) return;
    if (d.moving) { setDragging(false); setOffset(current => current <= -WIDTH / 2 ? -WIDTH : 0); }
    drag.current = d.moved ? { ...d, moving: false } : null;
  };
  // A swipe, or a tap while open, must not also follow the row's links.
  const click = (event: MouseEvent) => {
    if (drag.current?.moved || open) { event.preventDefault(); event.stopPropagation(); if (!drag.current?.moved) setOffset(0); }
    drag.current = null;
  };

  return <div className={styles.swipe} data-dragging={dragging || undefined}>
    <button type="button" className={styles.action} style={{ width: -offset }} tabIndex={open ? 0 : -1} aria-hidden={!open}
      disabled={disabled} onClick={() => { setOffset(0); onAction(); }}>{actionLabel}</button>
    <div className={styles.content} style={{ transform: offset ? `translateX(${offset}px)` : undefined }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClickCapture={click}>
      {children}
    </div>
  </div>;
}
