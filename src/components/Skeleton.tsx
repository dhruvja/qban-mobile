import { useEffect } from "react";
import { View, type ViewProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";

interface SkeletonProps extends ViewProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
}

/** Shimmer skeleton using brand colors (charcoal → dark-brown → charcoal) */
export default function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
  ...props
}: SkeletonProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      shimmer.value,
      [0, 1],
      ["#2D2D2D", "#3D3530"]
    ),
  }));

  return (
    <Animated.View
      {...props}
      style={[
        {
          width: width as number,
          height,
          borderRadius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Circle skeleton for avatars */
export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} />;
}

/** Pre-built skeleton row for leaderboard/list items */
export function SkeletonRow() {
  return (
    <View className="flex-row items-center py-3.5 border-b border-qban-charcoal">
      <SkeletonCircle size={32} />
      <View className="flex-1 ml-3 gap-1.5">
        <Skeleton width={120} height={14} />
        <Skeleton width={80} height={10} />
      </View>
      <Skeleton width={60} height={14} />
    </View>
  );
}

/** Market card skeleton */
export function SkeletonMarketCard() {
  return (
    <View className="bg-qban-charcoal border border-qban-tan/10 rounded-2xl p-4 mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <SkeletonCircle size={32} />
          <Skeleton width={80} height={16} />
        </View>
        <Skeleton width={70} height={16} />
      </View>
      <View className="flex-row items-center justify-between mb-3">
        <Skeleton width={90} height={12} />
        <Skeleton width={60} height={12} />
      </View>
      <Skeleton width="100%" height={40} borderRadius={4} />
    </View>
  );
}

/** Balance card skeleton */
export function SkeletonBalance() {
  return (
    <View className="items-center py-2">
      <Skeleton width={60} height={12} borderRadius={6} />
      <View className="mt-1">
        <Skeleton width={120} height={32} borderRadius={8} />
      </View>
    </View>
  );
}

/** Position card skeleton */
export function SkeletonPositionCard() {
  return (
    <View className="bg-qban-charcoal border border-qban-tan/10 rounded-2xl p-4 mb-3">
      <View className="flex-row items-center justify-between mb-3">
        <Skeleton width={100} height={16} />
        <Skeleton width={60} height={24} borderRadius={12} />
      </View>
      <View className="flex-row justify-between mb-2">
        <Skeleton width={80} height={12} />
        <Skeleton width={60} height={12} />
      </View>
      <View className="flex-row justify-between">
        <Skeleton width={80} height={12} />
        <Skeleton width={60} height={12} />
      </View>
    </View>
  );
}
