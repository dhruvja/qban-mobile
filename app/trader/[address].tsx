import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { fetchTraderPositions, fetchTraderOrders } from "../../src/api/client";
import { baseAtomsToSol } from "../../src/constants";
import {
  isFollowing as checkFollowing,
  followTrader,
  unfollowTrader,
  getFollowedTraders,
} from "../../src/services/followStorage";
import type { UserOrder } from "../../src/types";

function formatUsd(v: number): string {
  return `$${v.toFixed(2)}`;
}

function traderUsername(addr: string): string {
  return `@${addr.slice(0, 4).toLowerCase()}${addr.slice(-4).toLowerCase()}`;
}

export default function TraderProfileScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [positionSide, setPositionSide] = useState<string>("flat");
  const [refreshing, setRefreshing] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  const shortAddr = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "—";

  // Load follow state from AsyncStorage
  useEffect(() => {
    if (address) {
      checkFollowing(address).then(setFollowing);
      // Show 1 if we're following, 0 otherwise (local-only, no backend yet)
      checkFollowing(address).then((isF) => setFollowerCount(isF ? 1 : 0));
    }
  }, [address]);

  const handleToggleFollow = async () => {
    if (!address) return;
    if (following) {
      await unfollowTrader(address);
      setFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      await followTrader(address);
      setFollowing(true);
      setFollowerCount((c) => c + 1);
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const loadData = useCallback(async () => {
    if (!address) return;
    try {
      const [positions, traderOrders] = await Promise.all([
        fetchTraderPositions(address),
        fetchTraderOrders(address, 30),
      ]);
      const active = positions.find((p) => p.side !== "flat");
      setPositionSide(active?.side ?? "flat");
      setOrders(traderOrders);
    } catch {
      // silently fail
    }
  }, [address]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const totalTrades = orders.length;
  const totalVolume = orders.reduce((sum, o) => {
    const avgPrice =
      o.fills.length > 0
        ? o.fills.reduce((s, f) => s + f.price, 0) / o.fills.length
        : 0;
    return sum + baseAtomsToSol(o.filled_base_atoms) * avgPrice;
  }, 0);

  return (
    <SafeAreaView className="flex-1 bg-qban-black" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text className="font-dm text-base text-qban-smoke-dark">
            {"← Back"}
          </Text>
        </Pressable>
        <Text className="font-dm-bold text-lg text-qban-white">
          Trader Profile
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F5C518"
          />
        }
      >
        {/* Profile Card */}
        <View className="items-center px-6 py-6">
          <View className="w-16 h-16 rounded-full bg-qban-charcoal items-center justify-center mb-3">
            <Text className="font-dm-bold text-xl text-qban-yellow">
              {address?.slice(0, 2).toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text className="font-dm-bold text-base text-qban-yellow mb-0.5">
            {address ? traderUsername(address) : "—"}
          </Text>
          <Text className="font-space text-sm text-qban-smoke-dark mb-1">
            {shortAddr}
          </Text>

          {positionSide !== "flat" && (
            <View
              className={`rounded-full px-3 py-1 mt-1 ${
                positionSide === "long"
                  ? "bg-qban-green/15"
                  : "bg-qban-red/15"
              }`}
            >
              <Text
                className={`font-space text-xs ${
                  positionSide === "long"
                    ? "text-qban-green"
                    : "text-qban-red"
                }`}
              >
                Currently {positionSide === "long" ? "Long" : "Short"}
              </Text>
            </View>
          )}

          <Pressable
            className={`mt-4 rounded-xl px-8 py-2.5 ${
              following
                ? "bg-qban-charcoal border border-qban-tan/20"
                : "bg-qban-yellow"
            }`}
            onPress={handleToggleFollow}
          >
            <Text
              className={`font-dm-bold text-sm ${
                following ? "text-qban-smoke" : "text-qban-black"
              }`}
            >
              {following ? "Following" : "Follow"}
            </Text>
          </Pressable>
        </View>

        {/* Stats */}
        <View className="flex-row px-6 mb-6">
          <View className="flex-1 items-center">
            <Text className="font-space text-lg text-qban-white">
              {totalTrades}
            </Text>
            <Text className="font-dm text-xs text-qban-smoke-dark">
              Trades
            </Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="font-space text-lg text-qban-white">
              {totalVolume >= 1000
                ? `$${(totalVolume / 1000).toFixed(1)}K`
                : formatUsd(totalVolume)}
            </Text>
            <Text className="font-dm text-xs text-qban-smoke-dark">
              Volume
            </Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="font-space text-lg text-qban-white">
              {followerCount}
            </Text>
            <Text className="font-dm text-xs text-qban-smoke-dark">
              Followers
            </Text>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="px-6">
          <View className="flex-row items-center my-3">
            <View className="flex-1 h-px bg-qban-charcoal" />
            <Text className="font-space text-xs text-qban-smoke-dark mx-4 uppercase tracking-widest">
              Recent Activity
            </Text>
            <View className="flex-1 h-px bg-qban-charcoal" />
          </View>

          {orders.length > 0 ? (
            orders.slice(0, 20).map((order) => {
              const avgPrice =
                order.fills.length > 0
                  ? order.fills.reduce((s, f) => s + f.price, 0) /
                    order.fills.length
                  : 0;
              return (
                <View
                  key={order.id}
                  className="flex-row items-center justify-between py-2.5 border-b border-qban-charcoal"
                >
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm">
                      {order.is_bid ? "\u2705" : "\u274C"}
                    </Text>
                    <Text className="font-dm text-sm text-qban-white">
                      SOL {order.is_bid ? "UP" : "DOWN"}
                    </Text>
                  </View>
                  <Text className="font-space text-xs text-qban-smoke-dark">
                    {baseAtomsToSol(order.filled_base_atoms).toFixed(3)} SOL @{" "}
                    {formatUsd(avgPrice)}
                  </Text>
                </View>
              );
            })
          ) : (
            <View className="items-center py-8">
              <Text className="font-dm text-sm text-qban-smoke-dark">
                No activity yet
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
