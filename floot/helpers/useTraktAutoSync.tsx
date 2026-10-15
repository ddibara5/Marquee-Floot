import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { syncTrakt } from "../endpoints/trakt-sync_POST.schema";
import { isTraktSyncStale } from "./isTraktSyncStale";
import { useTraktStatus } from "./useTraktStatus";

const RETRY_GUARD_MS = 5 * 60 * 1000;

export const useTraktAutoSync = () => {
  const queryClient = useQueryClient();
  const trakt = useTraktStatus();
  const inFlight = useRef(false);
  const lastAttemptAt = useRef(0);

  const maybeSync = useCallback(
    async (status = trakt.data) => {
      if (!status?.connected) return;
      if (!isTraktSyncStale(status.lastSyncAt) &&
          status.personal?.lastSuccessAt && !status.personal.lastError) return;

      const now = Date.now();
      if (
        inFlight.current ||
        now - lastAttemptAt.current < RETRY_GUARD_MS
      ) {
        return;
      }

      inFlight.current = true;
      lastAttemptAt.current = now;

      try {
        await syncTrakt();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["marquee", "trakt-status"] }),
          queryClient.invalidateQueries({ queryKey: ["marquee", "titles"] }),
          queryClient.invalidateQueries({ queryKey: ["marquee", "title-episodes"] }),
          queryClient.invalidateQueries({ queryKey: ["marquee", "watch-history"] }),
          queryClient.invalidateQueries({ queryKey: ["marquee", "personal-state"] }),
        ]);
      } catch (error) {
        console.error("Automatic Trakt sync failed:", error);
        await queryClient.invalidateQueries({
          queryKey: ["marquee", "trakt-status"],
        });
      } finally {
        inFlight.current = false;
      }
    },
    [queryClient, trakt.data]
  );

  useEffect(() => {
    if (trakt.data) void maybeSync(trakt.data);
  }, [maybeSync, trakt.data]);

  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== "visible") return;
      const refreshed = await trakt.refetch();
      if (refreshed.data) await maybeSync(refreshed.data);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [maybeSync, trakt]);
};