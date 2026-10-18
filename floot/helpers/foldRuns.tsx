/** Groups items into contiguous runs that share a kind, keeping list order. */
export function foldRuns<T, K>(items: T[], kindOf: (item: T) => K): { kind: K; items: T[] }[] {
  const runs: { kind: K; items: T[] }[] = [];
  for (const item of items) {
    const kind = kindOf(item);
    const last = runs[runs.length - 1];
    if (last && last.kind === kind) last.items.push(item);
    else runs.push({ kind, items: [item] });
  }
  return runs;
}
