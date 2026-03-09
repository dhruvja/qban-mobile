import { useState, useEffect, useCallback } from "react";
import { fetchAllTraderFills, fetchTraderPositions } from "../api/client";
import { apiPriceToUsd } from "../constants";
import type { LeaderboardTrader, LeaderboardPeriod } from "../types";

function periodCutoff(period: LeaderboardPeriod): number {
  if (period === "all") return 0;
  const now = Date.now();
  if (period === "week") return now - 7 * 24 * 60 * 60 * 1000;
  return now - 30 * 24 * 60 * 60 * 1000;
}

export function useLeaderboard(
  market: string,
  period: LeaderboardPeriod = "all",
  oraclePrice: number = 0
) {
  const [traders, setTraders] = useState<LeaderboardTrader[]>([]);
  const [totalVolume, setTotalVolume] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all fills to discover unique traders
      const fills = await fetchAllTraderFills(market);

      // Filter fills by period
      const cutoff = periodCutoff(period);
      const filtered =
        cutoff > 0
          ? fills.filter(
              (f) => f.block_time && new Date(f.block_time).getTime() >= cutoff
            )
          : fills;

      // Collect unique trader addresses
      const traderAddrs = new Set<string>();
      for (const fill of filtered) {
        if (fill.taker) traderAddrs.add(fill.taker);
        if (fill.maker) traderAddrs.add(fill.maker);
      }

      // Fetch positions for each trader in parallel
      const posResults = await Promise.all(
        Array.from(traderAddrs).map(async (trader) => {
          try {
            const positions = await fetchTraderPositions(trader);
            const pos = positions.find((p) => p.market === market);
            return pos ? { trader, ...pos } : null;
          } catch {
            return null;
          }
        })
      );

      // Build leaderboard from positions data
      const results: Omit<LeaderboardTrader, "rank">[] = [];

      for (const pos of posResults) {
        if (!pos) continue;

        const totalBuysQuote = (pos.total_buys_quote || 0) / 1e6;
        const totalSellsQuote = (pos.total_sells_quote || 0) / 1e6;
        const volume = totalBuysQuote + totalSellsQuote;
        const trades = pos.num_fills || 0;
        const effectiveLeverage = pos.effective_leverage || 0;
        const entryPrice = pos.entry_price
          ? apiPriceToUsd(pos.entry_price)
          : 0;
        const side = pos.side || "flat";
        const positionSize = Math.abs(pos.net_base_atoms || 0) / 1e9;

        // PnL: flat = realized, open = unrealized
        const netBaseAtoms = pos.net_base_atoms || 0;
        const netQuoteAtoms = pos.net_quote_atoms || 0;
        const currentPositionValue = (netBaseAtoms / 1e9) * oraclePrice;
        const costBasis = netQuoteAtoms / 1e6;
        const pnl =
          side === "flat"
            ? totalSellsQuote - totalBuysQuote
            : currentPositionValue - costBasis;

        results.push({
          trader: pos.trader,
          trades,
          volume,
          pnl,
          effectiveLeverage,
          entryPrice,
          side,
          positionSize,
        });
      }

      // Sort by volume descending, assign ranks
      results.sort((a, b) => b.volume - a.volume);
      const ranked = results.map((t, i) => ({ ...t, rank: i + 1 }));

      setTraders(ranked);
      setTotalVolume(ranked.reduce((sum, t) => sum + t.volume, 0));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [market, period, oraclePrice]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30_000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  return { traders, totalVolume, loading, refresh: fetchLeaderboard };
}
