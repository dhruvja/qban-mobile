import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MARKETS } from "../../src/constants";
import { useAuth } from "../../src/providers/AuthProvider";
import { usePythPrice } from "../../src/hooks/usePythPrice";
import {
  fetchTicker24h,
  fetchSparkline,
  type MarketTicker,
  type SparklinePoint,
} from "../../src/api/binance";

function formatUsd(value: number): string {
  if (value >= 1000) {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return `$${value.toFixed(2)}`;
}

function formatVolume(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

// Simple SVG-like sparkline using View elements
function Sparkline({
  data,
  positive,
}: {
  data: SparklinePoint[];
  positive: boolean;
}) {
  if (data.length < 2) return null;

  const closes = data.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  return (
    <View className="flex-row items-end h-8 gap-px">
      {data.map((point, i) => {
        const height = Math.max(2, ((point.close - min) / range) * 32);
        return (
          <View
            key={i}
            style={{ height }}
            className={`flex-1 rounded-sm ${
              positive ? "bg-qban-green/60" : "bg-qban-red/60"
            }`}
          />
        );
      })}
    </View>
  );
}

export default function HomeScreen() {
  const { walletAddress } = useAuth();
  const { price: pythPrice } = usePythPrice();
  const [tickers, setTickers] = useState<Record<string, MarketTicker>>({});
  const [sparklines, setSparklines] = useState<
    Record<string, SparklinePoint[]>
  >({});
  const [refreshing, setRefreshing] = useState(false);

  const loadMarketData = useCallback(async () => {
    const tickerResults = await Promise.allSettled(
      MARKETS.map(async (m) => {
        const data = await fetchTicker24h(m.baseToken);
        return { token: m.baseToken, data };
      })
    );

    const sparklineResults = await Promise.allSettled(
      MARKETS.filter((m) => m.status === "live").map(async (m) => {
        const data = await fetchSparkline(m.baseToken);
        return { token: m.baseToken, data };
      })
    );

    const newTickers: Record<string, MarketTicker> = {};
    tickerResults.forEach((r) => {
      if (r.status === "fulfilled" && r.value.data) {
        newTickers[r.value.token] = r.value.data;
      }
    });
    setTickers(newTickers);

    const newSparklines: Record<string, SparklinePoint[]> = {};
    sparklineResults.forEach((r) => {
      if (r.status === "fulfilled" && r.value.data.length > 0) {
        newSparklines[r.value.token] = r.value.data;
      }
    });
    setSparklines(newSparklines);
  }, []);

  useEffect(() => {
    loadMarketData();
  }, [loadMarketData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMarketData();
    setRefreshing(false);
  }, [loadMarketData]);

  // Use Pyth price for SOL if available, otherwise fall back to Binance
  const getSolPrice = (): number | null => {
    if (pythPrice) return pythPrice;
    return tickers["SOL"]?.price ?? null;
  };

  return (
    <SafeAreaView className="flex-1 bg-qban-black" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F5C518"
            colors={["#F5C518"]}
          />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
          <Text className="font-bebas text-3xl text-qban-yellow tracking-widest">
            QBAN
          </Text>
          <View className="w-9 h-9 rounded-full bg-qban-charcoal items-center justify-center">
            <Text className="font-dm-bold text-sm text-qban-smoke">
              {walletAddress ? walletAddress.slice(0, 2).toUpperCase() : "?"}
            </Text>
          </View>
        </View>

        {/* Balance Section */}
        <View className="items-center px-6 py-8">
          <Text className="font-dm text-sm text-qban-smoke-dark mb-1">
            Your Balance
          </Text>
          <Text className="font-bebas text-5xl text-qban-white tracking-wider">
            $0.00
          </Text>

          <View className="flex-row gap-3 mt-5">
            <Pressable
              className="flex-1 bg-qban-yellow rounded-xl py-3 items-center active:bg-qban-yellow-light"
              onPress={() => router.push("/deposit" as never)}
            >
              <Text className="font-dm-bold text-sm text-qban-black">
                Deposit
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 bg-qban-charcoal border border-qban-tan/20 rounded-xl py-3 items-center active:opacity-80"
              onPress={() => router.push("/withdraw" as never)}
            >
              <Text className="font-dm-bold text-sm text-qban-white">
                Withdraw
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Markets Section */}
        <View className="px-6">
          <View className="flex-row items-center mb-4">
            <View className="flex-1 h-px bg-qban-charcoal" />
            <Text className="font-space text-xs text-qban-smoke-dark mx-4 uppercase tracking-widest">
              Markets
            </Text>
            <View className="flex-1 h-px bg-qban-charcoal" />
          </View>

          <View className="gap-3">
            {MARKETS.map((market) => {
              const ticker = tickers[market.baseToken];
              const sparklineData = sparklines[market.baseToken];
              const isLive = market.status === "live";
              const displayPrice =
                market.baseToken === "SOL"
                  ? getSolPrice()
                  : ticker?.price ?? null;
              const change = ticker?.change24hPercent ?? 0;
              const positive = change >= 0;

              return (
                <Pressable
                  key={market.symbol}
                  className={`bg-qban-charcoal border border-qban-tan/10 rounded-2xl p-4 ${
                    isLive ? "active:opacity-80" : "opacity-60"
                  }`}
                  onPress={() => {
                    if (isLive) {
                      router.push(`/trade/${market.symbol}` as never);
                    }
                  }}
                  disabled={!isLive}
                >
                  {/* Row 1: Name + Badge + Price */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-2">
                      <View className="w-8 h-8 rounded-full bg-qban-black items-center justify-center">
                        <Text className="font-dm-bold text-xs text-qban-yellow">
                          {market.baseToken.charAt(0)}
                        </Text>
                      </View>
                      <Text className="font-dm-bold text-base text-qban-white">
                        {market.symbol}
                      </Text>
                      {!isLive && (
                        <View className="bg-qban-tan/10 rounded-full px-2 py-0.5">
                          <Text className="font-space text-[10px] text-qban-smoke-dark uppercase">
                            soon
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="font-space text-base text-qban-white">
                      {displayPrice ? formatUsd(displayPrice) : "—"}
                    </Text>
                  </View>

                  {/* Row 2: Change + Volume */}
                  <View className="flex-row items-center justify-between mb-3">
                    <Text
                      className={`font-space text-sm ${
                        positive ? "text-qban-green" : "text-qban-red"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {change.toFixed(2)}% 24h
                    </Text>
                    {ticker && (
                      <Text className="font-space text-xs text-qban-smoke-dark">
                        Vol {formatVolume(ticker.volume24h)}
                      </Text>
                    )}
                  </View>

                  {/* Row 3: Sparkline */}
                  {isLive && sparklineData && (
                    <Sparkline data={sparklineData} positive={positive} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
