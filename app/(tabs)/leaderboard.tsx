import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { SkeletonRow } from "../../src/components/Skeleton";
import { router } from "expo-router";
import { usePythPrice } from "../../src/hooks/usePythPrice";
import { useLeaderboard } from "../../src/hooks/useLeaderboard";
import { useAuth } from "../../src/providers/AuthProvider";
import { fetchAllTraderFills } from "../../src/api/client";
import { getFollowedTraders } from "../../src/services/followStorage";
import { apiPriceToUsd, baseAtomsToSol } from "../../src/constants";
import { getMarketPda } from "../../src/solana/market-instructions";
import type { LeaderboardPeriod } from "../../src/types";

const [MARKET_ADDRESS] = getMarketPda();
const MARKET_STR = MARKET_ADDRESS.toBase58();

function formatUsd(v: number): string {
  if (Math.abs(v) >= 1000)
    return `$${(v / 1000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

/** Generate a deterministic @username from a wallet address */
function traderUsername(addr: string): string {
  return `@${addr.slice(0, 4).toLowerCase()}${addr.slice(-4).toLowerCase()}`;
}

interface FeedActivity {
  id: string;
  trader: string;
  side: "buy" | "sell";
  price: number;
  size: number;
  timestamp: number;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
  const [refreshing, setRefreshing] = useState(false);
  const { price: currentPrice } = usePythPrice();
  const { walletAddress } = useAuth();

  // Use the leaderboard hook (matches perp-ui logic)
  const {
    traders,
    totalVolume,
    loading: leaderboardLoading,
    refresh: refreshLeaderboard,
  } = useLeaderboard(MARKET_STR, period, currentPrice ?? 0);

  const [followedAddresses, setFollowedAddresses] = useState<string[]>([]);
  const [allFills, setAllFills] = useState<
    Array<{
      id?: string;
      signature?: string;
      price: string | number;
      base_atoms: number;
      taker_is_buy: boolean;
      block_time: string;
      taker?: string;
      maker?: string;
    }>
  >([]);
  const [reactions, setReactions] = useState<Record<string, { eyes: number; fire: number }>>({});
  const [myReactions, setMyReactions] = useState<Record<string, Set<"eyes" | "fire">>>({});

  const loadFollows = useCallback(async () => {
    const follows = await getFollowedTraders();
    setFollowedAddresses(follows);
  }, []);

  const loadFills = useCallback(async () => {
    try {
      const fills = await fetchAllTraderFills(MARKET_STR);
      setAllFills(fills);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadFollows();
    loadFills();
  }, [loadFollows, loadFills]);

  // Reload follows when switching to Friends tab
  useEffect(() => {
    if (tab === "friends") {
      loadFollows();
    }
  }, [tab, loadFollows]);

  const friendTraders = useMemo(() => {
    if (followedAddresses.length === 0) return [];
    const followSet = new Set(followedAddresses);
    return traders.filter((t) => followSet.has(t.trader));
  }, [traders, followedAddresses]);

  const feedItems = useMemo<FeedActivity[]>(() => {
    return allFills
      .filter((f) => f.block_time)
      .map((fill, index) => ({
        id: fill.id ?? fill.signature ?? String(index),
        trader: fill.taker ?? fill.maker ?? "unknown",
        side: fill.taker_is_buy ? ("buy" as const) : ("sell" as const),
        price: apiPriceToUsd(fill.price),
        size: baseAtomsToSol(fill.base_atoms),
        timestamp: new Date(fill.block_time).getTime(),
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100);
  }, [allFills]);

  const myRank = useMemo(() => {
    if (!walletAddress) return null;
    return traders.find((t) => t.trader === walletAddress) ?? null;
  }, [traders, walletAddress]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshLeaderboard(), loadFollows(), loadFills()]);
    setRefreshing(false);
  }, [refreshLeaderboard, loadFollows, loadFills]);

  const toggleReaction = useCallback((itemId: string, type: "eyes" | "fire") => {
    setMyReactions((prev) => {
      const current = prev[itemId] ?? new Set();
      const next = new Set(current);
      const wasActive = next.has(type);
      if (wasActive) {
        next.delete(type);
      } else {
        next.add(type);
      }
      setReactions((r) => {
        const cur = r[itemId] ?? { eyes: 0, fire: 0 };
        return {
          ...r,
          [itemId]: {
            ...cur,
            [type]: cur[type] + (wasActive ? -1 : 1),
          },
        };
      });
      return { ...prev, [itemId]: next };
    });
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-qban-black" edges={["top"]}>
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <Text className="font-bebas text-3xl text-qban-white tracking-wider">
          Leaderboard
        </Text>
        {totalVolume > 0 && tab === "top" && (
          <Text className="font-space text-xs text-qban-smoke-dark mt-1">
            Total Volume: {formatUsd(totalVolume)}
          </Text>
        )}
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
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
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
                      <View className="flex-row items-center gap-1.5">
                        <Text className="font-dm text-sm text-qban-yellow">
                          {traderUsername(item.trader)}
                        </Text>
                        {item.side !== "flat" && (
                          <View
                            className={`rounded-full px-1.5 py-0.5 ${
                              item.side === "long"
                                ? "bg-qban-green/15"
                                : "bg-qban-red/15"
                            }`}
                          >
                            <Text
                              className={`font-space text-[10px] ${
                                item.side === "long"
                                  ? "text-qban-green"
                                  : "text-qban-red"
                              }`}
                            >
                              {item.side === "long" ? "LONG" : "SHORT"}{" "}
                              {item.positionSize.toFixed(2)}
                            </Text>
                          </View>
                        )}
                      </View>
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
              </Animated.View>
            )}
            ListEmptyComponent={
              leaderboardLoading ? (
                <View className="px-0">
                  {[...Array(6)].map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </View>
              ) : (
                <View className="items-center py-12">
                  <Text className="font-dm text-sm text-qban-smoke-dark">
                    No traders yet
                  </Text>
                </View>
              )
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
              <Text className="font-dm text-base text-qban-smoke mb-2">
                No friends yet
              </Text>
              <Text className="font-dm text-sm text-qban-smoke-dark mb-4 text-center">
                Follow traders to see them here
              </Text>
              <Pressable
                className="bg-qban-yellow rounded-xl px-6 py-3 active:opacity-80"
                onPress={() => setTab("top")}
              >
                <Text className="font-dm-bold text-sm text-qban-black">
                  Explore Traders
                </Text>
              </Pressable>
            </View>
          }
        />
      )}

      {tab === "feed" && (
        <FlatList
          data={feedItems}
          keyExtractor={(item) => item.id}
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
              className="py-3.5 border-b border-qban-charcoal active:opacity-80"
              onPress={() => router.push(`/trader/${item.trader}` as never)}
            >
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-qban-charcoal items-center justify-center">
                    <Text className="font-dm-bold text-xs text-qban-smoke">
                      {item.trader.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <Text className="font-dm text-sm text-qban-yellow">
                    {traderUsername(item.trader)}
                  </Text>
                </View>
                <Text className="font-space text-xs text-qban-smoke-dark">
                  {timeAgo(item.timestamp)}
                </Text>
              </View>
              <View className="ml-10">
                <Text className="font-dm text-sm text-qban-white">
                  {item.side === "buy" ? "Bought" : "Sold"}{" "}
                  <Text className={item.side === "buy" ? "text-qban-green" : "text-qban-red"}>
                    {item.size.toFixed(3)} SOL
                  </Text>
                  {" "}at ${item.price.toFixed(2)}
                </Text>
                <View className="flex-row items-center justify-between mt-1.5">
                  <Text className="font-space text-xs text-qban-smoke-dark">
                    ${(item.size * item.price).toFixed(2)} notional
                  </Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      className={`flex-row items-center rounded-full px-2 py-0.5 ${
                        myReactions[item.id]?.has("eyes")
                          ? "bg-qban-yellow/20"
                          : "bg-qban-charcoal"
                      }`}
                      onPress={() => toggleReaction(item.id, "eyes")}
                    >
                      <Text className="text-xs">👀</Text>
                      {(reactions[item.id]?.eyes ?? 0) > 0 && (
                        <Text className="font-space text-xs text-qban-smoke ml-1">
                          {reactions[item.id].eyes}
                        </Text>
                      )}
                    </Pressable>
                    <Pressable
                      className={`flex-row items-center rounded-full px-2 py-0.5 ${
                        myReactions[item.id]?.has("fire")
                          ? "bg-qban-yellow/20"
                          : "bg-qban-charcoal"
                      }`}
                      onPress={() => toggleReaction(item.id, "fire")}
                    >
                      <Text className="text-xs">🔥</Text>
                      {(reactions[item.id]?.fire ?? 0) > 0 && (
                        <Text className="font-space text-xs text-qban-smoke ml-1">
                          {reactions[item.id].fire}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center">
              <Text className="font-dm text-sm text-qban-smoke-dark">
                Nothing happening yet. Be the first to trade!
              </Text>
            </View>
          }
        />
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
