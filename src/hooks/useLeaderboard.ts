import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchLeaderboard,
  type LeaderboardEntry,
  type LeaderboardPeriodApi,
} from "../api/client";

/** Map our UI period labels to the API period values */
function toApiPeriod(period: string): LeaderboardPeriodApi {
  switch (period) {
    case "week":
      return "this_week";
    case "month":
      return "this_month";
    default:
      return "all_time";
  }
}

export function useLeaderboard(period = "all") {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [totalVolume, setTotalVolume] = useState(0);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnce = useRef(false);

  const refresh = useCallback(async () => {
    try {
      if (!hasLoadedOnce.current) {
        setLoading(true);
      }
      const data = await fetchLeaderboard(toApiPeriod(period), 100);
      setEntries(data.items);
      setTotalVolume(
        data.items.reduce(
          (sum, e) => sum + parseFloat(e.volume_quote || "0") / 1e6,
          0
        )
      );
    } catch {
      // silently fail
    } finally {
      hasLoadedOnce.current = true;
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    hasLoadedOnce.current = false;
  }, [period]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { entries, totalVolume, loading, refresh };
}
