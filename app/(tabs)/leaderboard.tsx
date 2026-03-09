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
import { useLeaderboard } from "../../src/hooks/useLeaderboard";
import { useAuth } from "../../src/providers/AuthProvider";
import {
  fetchGlobalFeed,
  fetchFriendsFeed,
  type LeaderboardEntry,
  type FeedFill,
} from "../../src/api/client";
import { apiPriceToUsd, baseAtomsToSol } from "../../src/constants";
import { getFollowedTraders } from "../../src/services/followStorage";

function formatUsd(v: number): string {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

/** Generate a deterministic @username from a wallet address */
function traderUsername(addr: string): string {
  return `@${addr.slice(0, 4).toLowerCase()}${addr.slice(-4).toLowerCase()}`;
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
type Period = "all" | "week" | "month";

const TIME_FILTERS: { label: string; value: Period }[] = [
  { label: "All", value: "all" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

export default function LeaderboardScreen() {
  const [tab, setTab] = useState<Tab>("top");
  const [period, setPeriod] = useState<Period>("all");
  const [refreshing, setRefreshing] = useState(false);
  const { walletAddress } = useAuth();

  const {
    entries,
    totalVolume,
    loading: leaderboardLoading,
    refresh: refreshLeaderboard,
  } = useLeaderboard(period);

  // Friends tab: filter leaderboard by followed addresses
  const [followedAddresses, setFollowedAddresses] = useState<string[]>([]);

  // Feed tab: use API feed endpoints
  const [feedItems, setFeedItems] = useState<FeedFill[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  const [reactions, setReactions] = useState<
    Record<string, { eyes: number; fire: number }>
  >({});
  const [myReactions, setMyReactions] = useState<
    Record<string, Set<"eyes" | "fire">>
  >({});

  const loadFollows = useCallback(async () => {
    if (!walletAddress) return;
    const follows = await getFollowedTraders(walletAddress);
    setFollowedAddresses(follows);
  }, [walletAddress]);

  const loadFeed = useCallback(async () => {
    try {
      setFeedLoading(true);
      const data = walletAddress
        ? await fetchFriendsFeed(walletAddress, 100)
        : await fetchGlobalFeed(100);
      setFeedItems(data.items);
    } catch {
      // If friends feed is empty or fails, fall back to global
      try {
        const data = await fetchGlobalFeed(100);
        setFeedItems(data.items);
      } catch {
        // silently fail
      }
    } finally {
      setFeedLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadFollows();
  }, [loadFollows]);

  useEffect(() => {
    if (tab === "friends") {
      loadFollows();
    }
    if (tab === "feed") {
      loadFeed();
    }
  }, [tab, loadFollows, loadFeed]);

  const friendEntries = useMemo(() => {
    if (followedAddresses.length === 0) return [];
    const followSet = new Set(followedAddresses);
    return entries.filter((e) => followSet.has(e.address));
  }, [entries, followedAddresses]);

  const myRank = useMemo(() => {
    if (!walletAddress) return null;
    return entries.find((e) => e.address === walletAddress) ?? null;
  }, [entries, walletAddress]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const promises = [refreshLeaderboard(), loadFollows()];
    if (tab === "feed") promises.push(loadFeed());
    await Promise.all(promises);
    setRefreshing(false);
  }, [refreshLeaderboard, loadFollows, loadFeed, tab]);

  const toggleReaction = useCallback(
    (itemId: string, type: "eyes" | "fire") => {
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
    },
    []
  );

  const renderLeaderboardItem = useCallback(
    ({ item, index }: { item: LeaderboardEntry; index: number }) => {
      const volume = parseFloat(item.volume_quote || "0") / 1e6;
      const pnl = item.realized_pnl / 1e6;
      return (
        <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
          <Pressable
            className="flex-row items-center py-3.5 border-b border-qban-charcoal active:opacity-80"
            onPress={() => router.push(`/trader/${item.address}` as never)}
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
                    {item.address.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text className="font-dm text-sm text-qban-yellow">
                    {item.username
                      ? `@${item.username}`
                      : traderUsername(item.address)}
                  </Text>
                  <Text className="font-space text-xs text-qban-smoke-dark">
                    {item.num_trades} trades · Vol {formatUsd(volume)}
                  </Text>
                </View>
              </View>
            </View>

            {/* P&L */}
            <Text
              className={`font-space text-sm ${
                pnl >= 0 ? "text-qban-green" : "text-qban-red"
              }`}
            >
              {pnl >= 0 ? "+" : ""}
              {formatUsd(pnl)}
            </Text>
          </Pressable>
        </Animated.View>
      );
    },
    []
  );

  const renderFeedItem = useCallback(
    ({ item }: { item: FeedFill }) => {
      const price = apiPriceToUsd(item.price);
      const size = baseAtomsToSol(item.base_atoms);
      const notional = size * price;
      const trader = item.taker;
      const isBuy = item.taker_is_buy;
      const ts = new Date(item.block_time).getTime();
      const itemId = String(item.id);
      const displayName =
        item.taker_username
          ? `@${item.taker_username}`
          : traderUsername(trader);

      return (
        <Pressable
          className="py-3.5 border-b border-qban-charcoal active:opacity-80"
          onPress={() => router.push(`/trader/${trader}` as never)}
        >
          <View className="flex-row items-center justify-between mb-1.5">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-full bg-qban-charcoal items-center justify-center">
                <Text className="font-dm-bold text-xs text-qban-smoke">
                  {trader.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <Text className="font-dm text-sm text-qban-yellow">
                {displayName}
              </Text>
            </View>
            <Text className="font-space text-xs text-qban-smoke-dark">
              {timeAgo(ts)}
            </Text>
          </View>
          <View className="ml-10">
            <Text className="font-dm text-sm text-qban-white">
              {isBuy ? "Bought" : "Sold"}{" "}
              <Text
                className={isBuy ? "text-qban-green" : "text-qban-red"}
              >
                {size.toFixed(3)} SOL
              </Text>{" "}
              at ${price.toFixed(2)}
            </Text>
            <View className="flex-row items-center justify-between mt-1.5">
              <Text className="font-space text-xs text-qban-smoke-dark">
                ${notional.toFixed(2)} notional
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  className={`flex-row items-center rounded-full px-2 py-0.5 ${
                    myReactions[itemId]?.has("eyes")
                      ? "bg-qban-yellow/20"
                      : "bg-qban-charcoal"
                  }`}
                  onPress={() => toggleReaction(itemId, "eyes")}
                >
                  <Text className="text-xs">👀</Text>
                  {(reactions[itemId]?.eyes ?? 0) > 0 && (
                    <Text className="font-space text-xs text-qban-smoke ml-1">
                      {reactions[itemId].eyes}
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  className={`flex-row items-center rounded-full px-2 py-0.5 ${
                    myReactions[itemId]?.has("fire")
                      ? "bg-qban-yellow/20"
                      : "bg-qban-charcoal"
                  }`}
                  onPress={() => toggleReaction(itemId, "fire")}
                >
                  <Text className="text-xs">🔥</Text>
                  {(reactions[itemId]?.fire ?? 0) > 0 && (
                    <Text className="font-space text-xs text-qban-smoke ml-1">
                      {reactions[itemId].fire}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Pressable>
      );
    },
    [reactions, myReactions, toggleReaction]
  );

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
              {t === "top"
                ? "Top Traders"
                : t === "friends"
                  ? "Friends"
                  : "Feed"}
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
            data={entries}
            keyExtractor={(item) => item.address}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#F5C518"
              />
            }
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingBottom: 80,
            }}
            renderItem={renderLeaderboardItem}
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
          data={friendEntries}
          keyExtractor={(item) => item.address}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F5C518"
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 80,
            flexGrow: 1,
          }}
          renderItem={renderLeaderboardItem}
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
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F5C518"
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 80,
            flexGrow: 1,
          }}
          renderItem={renderFeedItem}
          ListEmptyComponent={
            feedLoading ? (
              <View className="px-0">
                {[...Array(4)].map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </View>
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="font-dm text-sm text-qban-smoke-dark">
                  Nothing happening yet. Be the first to trade!
                </Text>
              </View>
            )
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
                    {walletAddress
                      ? walletAddress.slice(0, 2).toUpperCase()
                      : "??"}
                  </Text>
                </View>
                <View>
                  <Text className="font-dm-medium text-sm text-qban-yellow">
                    Your Rank
                  </Text>
                  <Text className="font-space text-xs text-qban-smoke-dark">
                    {myRank
                      ? `${myRank.num_trades} trades · Vol ${formatUsd(
                          parseFloat(myRank.volume_quote || "0") / 1e6
                        )}`
                      : "No trades yet"}
                  </Text>
                </View>
              </View>
            </View>
            <Text
              className={`font-space text-sm ${
                myRank && myRank.realized_pnl >= 0
                  ? "text-qban-green"
                  : myRank
                    ? "text-qban-red"
                    : "text-qban-smoke-dark"
              }`}
            >
              {myRank
                ? `${myRank.realized_pnl >= 0 ? "+" : ""}${formatUsd(
                    myRank.realized_pnl / 1e6
                  )}`
                : "$0.00"}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
