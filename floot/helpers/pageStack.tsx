/** iOS-style page stack for the phone shell (October 16). The page under the current one stays mounted, frozen where
 *  it was, so Back can reveal it while you swipe (Idea 1). */
export type PageEntry<T> = {
  key: string;
  pathname: string;
  element: T;
  location: unknown;
  /** Viewport box of the page when it was covered, so it stays exactly where it was. */
  frame?: { top: number; left: number; width: number };
  /** Window scroll when it was covered, restored when it becomes the top page again. */
  scrollY?: number;
};

/** The stack after a navigation. PUSH covers the top page (keeps `max` pages), POP back to a kept page reveals it
 *  with its saved frame and scroll, POP to an unknown page starts over, REPLACE swaps the top page. */
export function nextPageStack<T>(stack: PageEntry<T>[], next: PageEntry<T>, action: string, max = 2): PageEntry<T>[] {
  const top = stack[stack.length - 1];
  if (top && top.key === next.key) return [...stack.slice(0, -1), { ...top, element: next.element, location: next.location }];
  if (action === "POP") {
    const index = stack.findIndex(entry => entry.key === next.key);
    return index >= 0 ? [...stack.slice(0, index), { ...stack[index], element: next.element, location: next.location }] : [next];
  }
  if (action === "REPLACE") return [...stack.slice(0, -1), next];
  return [...stack, next].slice(-max);
}
