import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { fetchTraderPositions, fetchTraderFills } from "../../src/api/client";
import { baseAtomsToSol } from "../../src/constants";
import {
  isFollowing as checkFollowing,
  followTrader,
  unfollowTrader,
  getFollowedTraders,
} from "../../src/services/followStorage";
import { FillsList } from "../../src/components/FillsList";

function formatUsd(v: number): string {
  return `$${v.toFixed(2)}`;
}

function traderUsername(addr: string): string {
  return `@${addr.slice(0, 4).toLowerCase()}${addr.slice(-4).toLowerCase()}`;
}

export default function TraderProfileScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const [fills, setFills] = useState<Awaited<ReturnType<typeof fetchTraderFills>>>([]);
  const [fillsLoading, setFillsLoading] = useState(true);
  const [positionSide, setPositionSide] = useState<string>("flat");
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const followScale = useSharedValue(1);
  const followAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: followScale.value }],
  }));

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
    followScale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const loadData = useCallback(async () => {
    if (!address) return;
    try {
      const [positions, traderFills] = await Promise.all([
        fetchTraderPositions(address),
        fetchTraderFills(address, 50),
      ]);
      const active = positions.find((p) => p.side !== "flat");
      setPositionSide(active?.side ?? "flat");
      setFills(traderFills);
      setTotalTrades(traderFills.length);
      setTotalVolume(
        traderFills.reduce((sum, f) => sum + baseAtomsToSol(f.baseAtoms) * f.price, 0)
      );
    } catch {
      // silently fail
    } finally {
      setFillsLoading(false);
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

          <Animated.View style={followAnimStyle}>
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
          </Animated.View>
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

        {/* Trade History */}
        <View className="px-6">
          <View className="flex-row items-center my-3">
            <View className="flex-1 h-px bg-qban-charcoal" />
            <Text className="font-space text-xs text-qban-smoke-dark mx-4 uppercase tracking-widest">
              Trade History
            </Text>
            <View className="flex-1 h-px bg-qban-charcoal" />
          </View>

          <FillsList fills={fills} loading={fillsLoading} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
