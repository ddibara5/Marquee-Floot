import { runTraktSync, skippedTraktSync, traktSyncErrorStatus } from "./traktSyncGate";

describe("Trakt sync gate (AF-20261023-03)", () => {
  it("never runs the sync for the automation account", async () => {
    const sync = jasmine.createSpy("sync").and.resolveTo(skippedTraktSync());
    const result = await runTraktSync(true, sync);
    expect(sync).not.toHaveBeenCalled();
    expect(result.runId).toBe(0);
    expect(result.fetched).toBe(0);
    expect(result.lastHistoryAt).toBeNull();
  });
  it("runs the sync for everyone else", async () => {
    const real = { ...skippedTraktSync(), runId: 57, fetched: 3 };
    const sync = jasmine.createSpy("sync").and.resolveTo(real);
    expect(await runTraktSync(false, sync)).toBe(real);
    expect(sync).toHaveBeenCalledTimes(1);
  });
  it("reports a sync already running as 409, not 500", () => {
    expect(traktSyncErrorStatus("IMPORT_ALREADY_RUNNING")).toBe(409);
    expect(traktSyncErrorStatus("duplicate key value violates unique constraint")).toBe(409);
    expect(traktSyncErrorStatus("Trakt not connected")).toBe(400);
    expect(traktSyncErrorStatus("HTTP_502")).toBe(500);
  });
});
