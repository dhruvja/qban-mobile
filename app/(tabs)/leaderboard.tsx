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
import { useAuth } from "../../src/providers/AuthProvider";
import { fetchAllTraderFills } from "../../src/api/client";
import { getFollowedTraders } from "../../src/services/followStorage";
import { apiPriceToUsd, baseAtomsToSol } from "../../src/constants";
import type { LeaderboardPeriod, LeaderboardTrader } from "../../src/types";

function formatUsd(v: number): string {
  if (Math.abs(v) >= 1000)
    return `$${(v / 1000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

/** Generate a deterministic @username from a wallet address */
function traderUsername(addr: string): string {
  return `@${addr.slice(0, 4).toLowerCase()}${addr.slice(-4).toLowerCase()}`;
}

type Tab = "top" | "friends" | "feed";

const TIME_FILTERS: { label: string; value: LeaderboardPeriod }[] = [
  { label: "All", value: "all" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

function getPeriodCutoff(period: LeaderboardPeriod): number {
  const now = Date.now();
  switch (period) {
    case "week":
      return now - 7 * 24 * 60 * 60 * 1000;
    case "month":
      return now - 30 * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
}

export default function LeaderboardScreen() {
  const [tab, setTab] = useState<Tab>("top");
  const [period, setPeriod] = useState<LeaderboardPeriod>("all");
  const [allFills, setAllFills] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { price: currentPrice } = usePythPrice();
  const { walletAddress } = useAuth();

  const [followedAddresses, setFollowedAddresses] = useState<string[]>([]);

  const loadFills = useCallback(async () => {
    try {
      const fills = await fetchAllTraderFills("SOL/USD");
      setAllFills(fills);
    } catch {
      // silently fail
    }
  }, []);

  const loadFollows = useCallback(async () => {
    const follows = await getFollowedTraders();
    setFollowedAddresses(follows);
  }, []);

  useEffect(() => {
    loadFills();
    loadFollows();
  }, [loadFills, loadFollows]);

  // Reload follows when switching to Friends tab
  useEffect(() => {
    if (tab === "friends") {
      loadFollows();
    }
  }, [tab, loadFollows]);

  // Compute leaderboard from fills, applying time filter
  const traders = useMemo(() => {
    const cutoff = getPeriodCutoff(period);

    const traderMap = new Map<
      string,
      { volume: number; trades: number; netBase: number; netQuote: number }
    >();

    for (const fill of allFills) {
      // Apply time filter
      if (fill.block_time) {
        const fillTime = new Date(fill.block_time).getTime();
        if (fillTime < cutoff) continue;
      } else if (period !== "all") {
        continue; // skip fills without timestamp when filtering
      }

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

    const oraclePrice = currentPrice ?? 0;
    return Array.from(traderMap.entries())
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
  }, [allFills, currentPrice, period]);

  const friendTraders = useMemo(() => {
    if (followedAddresses.length === 0) return [];
    const followSet = new Set(followedAddresses);
    return traders.filter((t) => followSet.has(t.trader));
  }, [traders, followedAddresses]);

  const myRank = useMemo(() => {
    if (!walletAddress) return null;
    return traders.find((t) => t.trader === walletAddress) ?? null;
  }, [traders, walletAddress]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadFills(), loadFollows()]);
    setRefreshing(false);
  }, [loadFills, loadFollows]);

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
                      <Text className="font-dm text-sm text-qban-yellow">
                        {traderUsername(item.trader)}
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
        <FlatList
          data={friendTraders}
          keyExtractor={(item) => item.trader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F5C518"
            />
          }
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 80, flexGrow: 1 }}
          renderItem={({ item }) => (
            <Pressable
              className="flex-row items-center py-3.5 border-b border-qban-charcoal active:opacity-80"
              onPress={() => router.push(`/trader/${item.trader}` as never)}
            >
              <View className="w-8 items-center">
                <Text
                  className={`font-space text-sm ${
                    item.rank <= 3 ? "text-qban-yellow" : "text-qban-smoke-dark"
                  }`}
                >
                  #{item.rank}
                </Text>
              </View>
              <View className="flex-1 ml-3">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-qban-charcoal items-center justify-center">
                    <Text className="font-dm-bold text-xs text-qban-smoke">
                      {item.trader.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text className="font-dm text-sm text-qban-yellow">
                      {traderUsername(item.trader)}
                    </Text>
                    <Text className="font-space text-xs text-qban-smoke-dark">
                      {item.trades} trades · Vol {formatUsd(item.volume)}
                    </Text>
                  </View>
                </View>
              </View>
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
            <View className="flex-1 items-center justify-center">
              <Text className="font-dm text-sm text-qban-smoke-dark">
                Follow traders to see them here
              </Text>
            </View>
          }
        />
      )}

      {tab === "feed" && (
        <View className="flex-1 items-center justify-center">
          <Text className="font-dm text-sm text-qban-smoke-dark">
            Trade activity will appear here
          </Text>
        </View>
      )}

      {/* Sticky Your Rank footer */}
      {tab === "top" && (
        <View className="px-6 py-3 bg-qban-charcoal border-t border-qban-charcoal">
          <View className="flex-row items-center">
            <View className="w-8 items-center">
              <Text className="font-space text-sm text-qban-yellow">
                {myRank ? myRank.rank : "—"}
              </Text>
            </View>
            <View className="flex-1 ml-3">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-qban-yellow/20 items-center justify-center">
                  <Text className="font-dm-bold text-xs text-qban-yellow">
                    {walletAddress ? walletAddress.slice(0, 2).toUpperCase() : "??"}
                  </Text>
                </View>
                <View>
                  <Text className="font-dm-medium text-sm text-qban-yellow">
                    Your Rank
                  </Text>
                  <Text className="font-space text-xs text-qban-smoke-dark">
                    {myRank
                      ? `${myRank.trades} trades · Vol ${formatUsd(myRank.volume)}`
                      : "No trades yet"}
                  </Text>
                </View>
              </View>
            </View>
            <Text
              className={`font-space text-sm ${
                myRank && myRank.pnl >= 0 ? "text-qban-green" : myRank ? "text-qban-red" : "text-qban-smoke-dark"
              }`}
            >
              {myRank
                ? `${myRank.pnl >= 0 ? "+" : ""}${formatUsd(myRank.pnl)}`
                : "$0.00"}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
