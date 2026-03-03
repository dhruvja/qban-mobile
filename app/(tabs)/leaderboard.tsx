import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { usePythPrice } from "../../src/hooks/usePythPrice";
import { fetchAllTraderFills } from "../../src/api/client";
import { apiPriceToUsd, baseAtomsToSol } from "../../src/constants";
import type { LeaderboardPeriod, LeaderboardTrader } from "../../src/types";

function formatUsd(v: number): string {
  if (Math.abs(v) >= 1000)
    return `$${(v / 1000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

type Tab = "top" | "friends" | "feed";

const TIME_FILTERS: { label: string; value: LeaderboardPeriod }[] = [
  { label: "All", value: "all" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

export default function LeaderboardScreen() {
  const [tab, setTab] = useState<Tab>("top");
  const [period, setPeriod] = useState<LeaderboardPeriod>("all");
  const [traders, setTraders] = useState<LeaderboardTrader[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { price: currentPrice } = usePythPrice();

  const loadLeaderboard = useCallback(async () => {
    try {
      const fills = await fetchAllTraderFills("SOL/USD");

      // Aggregate by trader
      const traderMap = new Map<
        string,
        { volume: number; trades: number; netBase: number; netQuote: number }
      >();

      for (const fill of fills) {
        const trader = fill.taker ?? fill.maker ?? "unknown";
        const existing = traderMap.get(trader) ?? {
          volume: 0,
          trades: 0,
          netBase: 0,
          netQuote: 0,
        };

        const price = apiPriceToUsd(fill.price);
        const size = baseAtomsToSol(fill.base_atoms);
        existing.volume += size * price;
        existing.trades += 1;

        if (fill.taker_is_buy) {
          existing.netBase += size;
          existing.netQuote -= size * price;
        } else {
          existing.netBase -= size;
          existing.netQuote += size * price;
        }

        traderMap.set(trader, existing);
      }

      // Compute P&L using current oracle price
      const oraclePrice = currentPrice ?? 0;
      const leaderboard: LeaderboardTrader[] = Array.from(traderMap.entries())
        .map(([trader, data]) => ({
          trader,
          trades: data.trades,
          volume: data.volume,
          pnl: data.netQuote + data.netBase * oraclePrice,
          rank: 0,
          effectiveLeverage: 1,
          entryPrice: 0,
          side: "flat" as const,
          positionSize: Math.abs(data.netBase),
        }))
        .sort((a, b) => b.pnl - a.pnl)
        .map((t, i) => ({ ...t, rank: i + 1 }));

      setTraders(leaderboard);
    } catch {
      // silently fail
    }
  }, [currentPrice]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  }, [loadLeaderboard]);

  const shortAddr = (addr: string) =>
    `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  return (
    <SafeAreaView className="flex-1 bg-qban-black" edges={["top"]}>
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <Text className="font-bebas text-3xl text-qban-white tracking-wider">
          Leaderboard
        </Text>
      </View>

      {/* Tab bar */}
      <View className="flex-row px-6 mb-3 gap-1">
        {(["top", "friends", "feed"] as Tab[]).map((t) => (
          <Pressable
            key={t}
            className={`flex-1 rounded-lg py-2 items-center ${
              tab === t ? "bg-qban-charcoal" : ""
            }`}
            onPress={() => setTab(t)}
          >
            <Text
              className={`font-dm-medium text-sm ${
                tab === t ? "text-qban-yellow" : "text-qban-smoke-dark"
              }`}
            >
              {t === "top" ? "Top Traders" : t === "friends" ? "Friends" : "Feed"}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "top" && (
        <>
          {/* Time filter */}
          <View className="flex-row px-6 mb-3 gap-2">
            {TIME_FILTERS.map((f) => (
              <Pressable
                key={f.value}
                className={`rounded-full px-3 py-1 border ${
                  period === f.value
                    ? "border-qban-yellow bg-qban-yellow/10"
                    : "border-qban-charcoal"
                }`}
                onPress={() => setPeriod(f.value)}
              >
                <Text
                  className={`font-space text-xs ${
                    period === f.value
                      ? "text-qban-yellow"
                      : "text-qban-smoke-dark"
                  }`}
                >
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <FlatList
            data={traders}
            keyExtractor={(item) => item.trader}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#F5C518"
              />
            }
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 80 }}
            renderItem={({ item }) => (
              <Pressable
                className="flex-row items-center py-3.5 border-b border-qban-charcoal active:opacity-80"
                onPress={() => router.push(`/trader/${item.trader}` as never)}
              >
                {/* Rank */}
                <View className="w-8 items-center">
                  <Text
                    className={`font-space text-sm ${
                      item.rank <= 3
                        ? "text-qban-yellow"
                        : "text-qban-smoke-dark"
                    }`}
                  >
                    {item.rank}
                  </Text>
                </View>

                {/* Avatar + Name */}
                <View className="flex-1 ml-3">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-full bg-qban-charcoal items-center justify-center">
                      <Text className="font-dm-bold text-xs text-qban-smoke">
                        {item.trader.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text className="font-dm text-sm text-qban-white">
                        {shortAddr(item.trader)}
                      </Text>
                      <Text className="font-space text-xs text-qban-smoke-dark">
                        {item.trades} trades · Vol{" "}
                        {formatUsd(item.volume)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* P&L */}
                <Text
                  className={`font-space text-sm ${
                    item.pnl >= 0 ? "text-qban-green" : "text-qban-red"
                  }`}
                >
                  {item.pnl >= 0 ? "+" : ""}
                  {formatUsd(item.pnl)}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <View className="items-center py-12">
                <Text className="font-dm text-sm text-qban-smoke-dark">
                  No traders yet
                </Text>
              </View>
            }
          />
        </>
      )}

      {tab === "friends" && (
        <View className="flex-1 items-center justify-center">
          <Text className="font-dm text-sm text-qban-smoke-dark">
            Follow traders to see them here
          </Text>
        </View>
      )}

      {tab === "feed" && (
        <View className="flex-1 items-center justify-center">
          <Text className="font-dm text-sm text-qban-smoke-dark">
            Trade activity will appear here
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
