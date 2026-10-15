import { isTraktSyncStale } from "./isTraktSyncStale";

describe("isTraktSyncStale", () => {
  const now = new Date("2026-09-25T16:00:00Z").getTime();

  it("treats a missing sync as stale", () => {
    expect(isTraktSyncStale(null, now)).toBe(true);
  });

  it("keeps a recent sync fresh", () => {
    expect(
      isTraktSyncStale("2026-09-25T12:00:01Z", now)
    ).toBe(false);
  });

  it("treats a sync at least six hours old as stale", () => {
    expect(
      isTraktSyncStale("2026-09-25T10:00:00Z", now)
    ).toBe(true);
  });
});