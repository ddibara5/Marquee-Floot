import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export function useEdgeSwipeBack(active: boolean, onBack: () => void, panelRef: RefObject<HTMLElement | null>, routeKey: string) {
  const callback = useRef(onBack);
  callback.current = onBack;
  useEffect(() => {
    if (!active || window.innerWidth > 650) return;
    const panel = panelRef.current;
    if (!panel) return;
    let x = 0, y = 0, started = 0, tracking = false, dragging = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reset = () => {
      panel.style.transition = reduced ? "none" : "transform 180ms cubic-bezier(.2,.7,.2,1)";
      panel.style.transform = "translate3d(0,0,0)";
      tracking = dragging = false;
    };
    const start = (event: TouchEvent) => {
      if (document.querySelector('[data-ui-overlay][data-state="open"],[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"]') || (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable="true"]'))) return;
      if (event.touches.length !== 1 || event.touches[0].clientX > 28) return;
      x = event.touches[0].clientX; y = event.touches[0].clientY;
      started = performance.now(); tracking = true; dragging = false;
      panel.style.transition = "none";
    };
    const move = (event: TouchEvent) => {
      if (!tracking || event.touches.length !== 1) return;
      const dx = event.touches[0].clientX - x, dy = event.touches[0].clientY - y;
      if (!dragging && Math.abs(dy) > Math.abs(dx) + 8) { reset(); return; }
      if (dx > 12 && dx > Math.abs(dy) * 1.2) dragging = true;
      if (!dragging) return;
      event.preventDefault();
      panel.style.transform = `translate3d(${Math.min(Math.max(dx, 0), window.innerWidth)}px,0,0)`;
    };
    const end = (event: TouchEvent) => {
      if (!tracking) return;
      const touch = event.changedTouches[0];
      const dx = touch ? touch.clientX - x : 0, dy = touch ? touch.clientY - y : 0;
      if (dragging && dx > Math.abs(dy) * 1.2 && (dx > 76 || (dx > 46 && performance.now() - started < 240))) {
        panel.style.transition = reduced ? "none" : "transform 180ms cubic-bezier(.2,.7,.2,1)";
        panel.style.transform = "translate3d(100vw,0,0)";
        timer = setTimeout(() => { timer = null; callback.current(); }, reduced ? 0 : 180);
      } else reset();
      tracking = dragging = false;
    };
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end, { passive: true });
    document.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", reset);
      if (timer) clearTimeout(timer);
      panel.style.transition = ""; panel.style.transform = "";
    };
  }, [active, panelRef, routeKey]);
}