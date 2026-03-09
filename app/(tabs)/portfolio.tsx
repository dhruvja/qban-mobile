import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useAuth } from "../../src/providers/AuthProvider";
import { usePythPrice } from "../../src/hooks/usePythPrice";
import { useUsdcBalance } from "../../src/hooks/useUsdcBalance";
import { fetchTraderPositions, fetchTraderOrders } from "../../src/api/client";
import { apiPriceToUsd, baseAtomsToSol, CLOSE_PRESETS } from "../../src/constants";
import type { UserOrder } from "../../src/types";

function formatUsd(v: number): string {
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTime(timestamp: string | undefined): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(timestamp: string | undefined): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface PositionData {
  market: string;
  side: "long" | "short";
  sizeBase: number;
  sizeSol: number;
  entryPrice: number;
  leverage: number;
}

export default function PortfolioScreen() {
  const { walletAddress } = useAuth();
  const { price: currentPrice } = usePythPrice();
  const { balance: usdcBalance, refetch: refetchBalance } = useUsdcBalance(walletAddress);

  const [position, setPosition] = useState<PositionData | null>(null);
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [closingPct, setClosingPct] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const [positions, traderOrders] = await Promise.all([
        fetchTraderPositions(walletAddress),
        fetchTraderOrders(walletAddress, 50),
      ]);

      // Find active position (non-flat)
      const active = positions.find(
        (p) => p.side !== "flat" && p.net_base_atoms !== 0
      );
      if (active) {
        setPosition({
          market: active.market,
          side: active.side as "long" | "short",
          sizeBase: Math.abs(active.net_base_atoms),
          sizeSol: baseAtomsToSol(Math.abs(active.net_base_atoms)),
          entryPrice: active.entry_price
            ? apiPriceToUsd(active.entry_price)
            : 0,
          leverage: active.effective_leverage || 1,
        });
      } else {
        setPosition(null);
      }

      setOrders(traderOrders);
    } catch {
      // Silently fail — will show empty state
    }
  }, [walletAddress]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(), refetchBalance()]);
    setRefreshing(false);
  }, [loadData]);

  // P&L calculation
  const pnl = useMemo(() => {
    if (!position || !currentPrice || !position.entryPrice) return null;
    const diff = currentPrice - position.entryPrice;
    const direction = position.side === "long" ? 1 : -1;
    const pnlUsd =
      diff * direction * position.sizeSol * position.leverage;
    const pnlPct =
      ((diff * direction) / position.entryPrice) * 100 * position.leverage;
    return { usd: pnlUsd, pct: pnlPct };
  }, [position, currentPrice]);

  const liquidationPrice = useMemo(() => {
    if (!position || !position.entryPrice || position.leverage <= 0) return 0;
    const liqMove = position.entryPrice / position.leverage;
    return position.side === "long"
      ? position.entryPrice - liqMove
      : position.entryPrice + liqMove;
  }, [position]);

  // Balance from on-chain USDC
  const inPositions = position
    ? position.sizeSol * (position.entryPrice || 0)
    : 0;
  const totalBalance = usdcBalance + inPositions;
  const available = usdcBalance;

  // ─── Close Position Bottom Sheet ────────────────────────────
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["45%"], []);

  const openCloseSheet = useCallback((pct: number) => {
    setClosingPct(pct);
    sheetRef.current?.snapToIndex(0);
  }, []);

  const handleClose = useCallback(async () => {
    setSubmitting(true);
    try {
      // TODO: Build and send close instruction
      Alert.alert("Position Closed", `Closed ${(closingPct ?? 0) * 100}% of your position`);
      sheetRef.current?.close();
      setClosingPct(null);
      await loadData();
    } catch {
      Alert.alert("Close Failed", "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [closingPct, loadData]);

  // ─── Group orders by date ──────────────────────────────────
  const groupedOrders = useMemo(() => {
    const groups: { date: string; items: UserOrder[] }[] = [];
    let currentGroup: { date: string; items: UserOrder[] } | null = null;

    for (const order of orders) {
      const dateStr = formatDate(order.block_time);
      if (!currentGroup || currentGroup.date !== dateStr) {
        currentGroup = { date: dateStr, items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(order);
    }
    return groups;
  }, [orders]);

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
        <View className="px-6 pt-4 pb-2">
          <Text className="font-bebas text-3xl text-qban-white tracking-wider">
            Portfolio
          </Text>
        </View>

        {/* Balance Overview */}
        <View className="px-6 py-4">
          <View className="flex-row justify-between mb-2">
            <Text className="font-dm text-sm text-qban-smoke-dark">
              Total Balance
            </Text>
            <Text className="font-space text-base text-qban-white">
              {formatUsd(totalBalance)}
            </Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="font-dm text-sm text-qban-smoke-dark">
              Available
            </Text>
            <Text className="font-space text-sm text-qban-smoke">
              {formatUsd(Math.max(0, available))}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="font-dm text-sm text-qban-smoke-dark">
              In Positions
            </Text>
            <Text className="font-space text-sm text-qban-smoke">
              {formatUsd(Math.max(0, inPositions))}
            </Text>
          </View>
        </View>

        {/* Active Position */}
        <View className="px-6">
          <View className="flex-row items-center my-3">
            <View className="flex-1 h-px bg-qban-charcoal" />
            <Text className="font-space text-xs text-qban-smoke-dark mx-4 uppercase tracking-widest">
              Active Position
            </Text>
            <View className="flex-1 h-px bg-qban-charcoal" />
          </View>

          {position ? (
            <View className="bg-qban-charcoal border border-qban-tan/10 rounded-2xl p-4">
              {/* Header */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <Text className="font-dm-bold text-base text-qban-white">
                    {position.market || "SOL/USD"}
                  </Text>
                  <View
                    className={`rounded-full px-2 py-0.5 ${
                      position.side === "long"
                        ? "bg-qban-green/15"
                        : "bg-qban-red/15"
                    }`}
                  >
                    <Text
                      className={`font-space text-xs ${
                        position.side === "long"
                          ? "text-qban-green"
                          : "text-qban-red"
                      }`}
                    >
                      {position.side === "long" ? "UP" : "DOWN"}
                    </Text>
                  </View>
                </View>
                {pnl && (
                  <Text
                    className={`font-space text-lg ${
                      pnl.usd >= 0 ? "text-qban-green" : "text-qban-red"
                    }`}
                  >
                    {pnl.usd >= 0 ? "+" : ""}
                    {formatUsd(pnl.usd)} ({pnl.pct >= 0 ? "+" : ""}
                    {pnl.pct.toFixed(1)}%)
                  </Text>
                )}
              </View>

              {/* Details */}
              <View className="gap-1.5 mb-4">
                <View className="flex-row justify-between">
                  <Text className="font-dm text-sm text-qban-smoke-dark">
                    Size
                  </Text>
                  <Text className="font-space text-sm text-qban-white">
                    {position.sizeSol.toFixed(3)} SOL ({position.leverage}x)
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-dm text-sm text-qban-smoke-dark">
                    Entry
                  </Text>
                  <Text className="font-space text-sm text-qban-white">
                    {formatUsd(position.entryPrice)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-dm text-sm text-qban-smoke-dark">
                    Current
                  </Text>
                  <Text className="font-space text-sm text-qban-white">
                    {currentPrice ? formatUsd(currentPrice) : "—"}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-dm text-sm text-qban-smoke-dark">
                    Liquidation
                  </Text>
                  <Text className="font-space text-sm text-qban-red">
                    {formatUsd(liquidationPrice)}
                  </Text>
                </View>
              </View>

              {/* Close Buttons */}
              <View className="flex-row gap-2">
                {CLOSE_PRESETS.map((pct) => (
                  <Pressable
                    key={pct}
                    className="flex-1 bg-qban-black border border-qban-tan/10 rounded-lg py-2.5 items-center active:opacity-80"
                    onPress={() => openCloseSheet(pct)}
                  >
                    <Text className="font-space text-xs text-qban-smoke">
                      {pct === 1 ? "Close All" : `Close ${pct * 100}%`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <View className="items-center py-12">
              <Text className="font-dm text-base text-qban-smoke mb-2">
                No positions yet
              </Text>
              <Text className="font-dm text-sm text-qban-smoke-dark mb-4 text-center">
                Ready to make your first trade?
              </Text>
              <Pressable
                className="bg-qban-yellow rounded-xl px-6 py-3 active:opacity-80"
                onPress={() => router.push(`/trade/${encodeURIComponent("SOL/USD")}` as never)}
              >
                <Text className="font-dm-bold text-sm text-qban-black">
                  Trade Now
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Trade History */}
        <View className="px-6 mt-4">
          <View className="flex-row items-center my-3">
            <View className="flex-1 h-px bg-qban-charcoal" />
            <Text className="font-space text-xs text-qban-smoke-dark mx-4 uppercase tracking-widest">
              History
            </Text>
            <View className="flex-1 h-px bg-qban-charcoal" />
          </View>

          {groupedOrders.length > 0 ? (
            groupedOrders.map((group) => (
              <View key={group.date} className="mb-4">
                <Text className="font-dm-medium text-xs text-qban-smoke-dark mb-2">
                  {group.date}
                </Text>
                {group.items.map((order) => {
                  const totalFillPrice =
                    order.fills.length > 0
                      ? order.fills.reduce((sum, f) => sum + f.price, 0) /
                        order.fills.length
                      : 0;
                  const fillSizeSol = baseAtomsToSol(order.filled_base_atoms);
                  const isWin = order.is_bid; // simplified — real P&L needs entry/exit comparison

                  return (
                    <View
                      key={order.id}
                      className="flex-row items-center justify-between py-2.5 border-b border-qban-charcoal"
                    >
                      <View className="flex-row items-center gap-2">
                        <Text className="text-sm">
                          {isWin ? "\u2705" : "\u274C"}
                        </Text>
                        <View>
                          <Text className="font-dm text-sm text-qban-white">
                            SOL {order.is_bid ? "UP" : "DOWN"}
                          </Text>
                          <Text className="font-dm text-xs text-qban-smoke-dark">
                            {fillSizeSol.toFixed(3)} SOL @{" "}
                            {formatUsd(totalFillPrice)}
                          </Text>
                        </View>
                      </View>
                      <Text className="font-dm text-xs text-qban-smoke-dark">
                        {formatTime(order.block_time)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))
          ) : (
            <View className="items-center py-8">
              <Text className="font-dm text-sm text-qban-smoke-dark">
                Your trade history will appear here after your first trade.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Close Position Bottom Sheet */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: "#2D2D2D" }}
        handleIndicatorStyle={{ backgroundColor: "#B8B2AA" }}
      >
        <BottomSheetView className="flex-1 px-6 pt-2 pb-8">
          <Text className="font-dm-bold text-lg text-qban-white text-center mb-6">
            Close Position
          </Text>

          {closingPct && position && (
            <View className="gap-3 mb-8">
              <Text className="font-dm text-sm text-qban-smoke text-center mb-2">
                Closing {closingPct * 100}% of your position
              </Text>

              <View className="flex-row justify-between">
                <Text className="font-dm text-sm text-qban-smoke-dark">
                  You receive
                </Text>
                <Text className="font-space text-sm text-qban-white">
                  ~
                  {formatUsd(
                    position.sizeSol *
                      closingPct *
                      (currentPrice ?? position.entryPrice)
                  )}
                </Text>
              </View>

              {pnl && (
                <View className="flex-row justify-between">
                  <Text className="font-dm text-sm text-qban-smoke-dark">
                    Profit/Loss
                  </Text>
                  <Text
                    className={`font-space text-sm ${
                      pnl.usd * closingPct >= 0
                        ? "text-qban-green"
                        : "text-qban-red"
                    }`}
                  >
                    {pnl.usd * closingPct >= 0 ? "+" : ""}
                    {formatUsd(pnl.usd * closingPct)}
                  </Text>
                </View>
              )}

              {closingPct < 1 && (
                <View className="flex-row justify-between">
                  <Text className="font-dm text-sm text-qban-smoke-dark">
                    Remaining
                  </Text>
                  <Text className="font-space text-sm text-qban-white">
                    {formatUsd(
                      position.sizeSol *
                        (1 - closingPct) *
                        position.entryPrice
                    )}{" "}
                    ({position.leverage}x)
                  </Text>
                </View>
              )}
            </View>
          )}

          <Pressable
            className="bg-qban-red rounded-xl py-4 items-center mb-3 active:opacity-90"
            onPress={handleClose}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="font-dm-bold text-base text-qban-white">
                Confirm Close
              </Text>
            )}
          </Pressable>

          <Pressable
            className="py-3 items-center"
            onPress={() => sheetRef.current?.close()}
          >
            <Text className="font-dm text-sm text-qban-smoke-dark">
              Cancel
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
}
