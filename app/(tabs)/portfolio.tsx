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
import { PublicKey, Transaction, ComputeBudgetProgram } from "@solana/web3.js";
import { useAuth } from "../../src/providers/AuthProvider";
import { useUnifiedWallet } from "../../src/providers/UnifiedWalletProvider";
import { useConnections } from "../../src/providers/ConnectionProvider";
import { usePythPrice } from "../../src/hooks/usePythPrice";
import { useMarginBalance } from "../../src/hooks/useMarginBalance";
import {
  buildBatchUpdate,
  getMarketPda,
  OrderType,
} from "../../src/solana/market-instructions";
import { CLOSE_PRESETS, baseAtomsToSol } from "../../src/constants";
import { fetchTraderFills } from "../../src/api/client";

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

interface FillItem {
  orderId: number;
  isBid: boolean;
  baseAtoms: number;
  quoteAtoms: number;
  price: number;
  blockTime: string | undefined;
}

export default function PortfolioScreen() {
  const { walletAddress } = useAuth();
  const { price: currentPrice } = usePythPrice();
  const { position, marginUsd, refresh: refreshBalance } = useMarginBalance();
  const { sendTransaction } = useUnifiedWallet();
  const { magicblockConnection } = useConnections();

  const [refreshing, setRefreshing] = useState(false);
  const [closingPct, setClosingPct] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fills, setFills] = useState<Awaited<ReturnType<typeof fetchTraderFills>>>([]);
  const [fillsLoading, setFillsLoading] = useState(true);

  const hasPosition = position && position.direction !== "FLAT";
  const positionSol = position ? Math.abs(position.positionBase) : 0;
  const side = position?.direction === "LONG" ? "long" : "short";

  // Cost basis → entry price estimate
  const entryPrice = useMemo(() => {
    if (!position || positionSol === 0) return 0;
    return Number(position.costBasisAtoms) / 1e6 / positionSol;
  }, [position, positionSol]);

  const loadFills = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const data = await fetchTraderFills(walletAddress, 50);
      setFills(data);
    } catch {
      // silently fail
    } finally {
      setFillsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadFills();
  }, [loadFills]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshBalance(), loadFills()]);
    setRefreshing(false);
  }, [refreshBalance, loadFills]);

  // P&L calculation
  const pnl = useMemo(() => {
    if (!hasPosition || !currentPrice || !entryPrice) return null;
    const diff = currentPrice - entryPrice;
    const direction = side === "long" ? 1 : -1;
    const pnlUsd = diff * direction * positionSol;
    const pnlPct = ((diff * direction) / entryPrice) * 100;
    return { usd: pnlUsd, pct: pnlPct };
  }, [hasPosition, currentPrice, entryPrice, side, positionSol]);

  // Balance
  const inPositions = hasPosition && currentPrice
    ? positionSol * currentPrice
    : 0;
  const totalBalance = marginUsd + inPositions;

  // ─── Group fills by date ────────────────────────────────────
  const groupedFills = useMemo(() => {
    const groups: { date: string; items: FillItem[] }[] = [];
    let currentGroup: { date: string; items: FillItem[] } | null = null;

    for (const fill of fills) {
      const dateStr = formatDate(fill.blockTime);
      if (!currentGroup || currentGroup.date !== dateStr) {
        currentGroup = { date: dateStr, items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(fill);
    }
    return groups;
  }, [fills]);

  // ─── Close Position Bottom Sheet ────────────────────────────
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["45%"], []);

  const openCloseSheet = useCallback((pct: number) => {
    setClosingPct(pct);
    sheetRef.current?.snapToIndex(0);
  }, []);

  const handleClose = useCallback(async () => {
    if (!walletAddress || !hasPosition || !currentPrice || !closingPct) return;
    setSubmitting(true);
    try {
      const publicKey = new PublicKey(walletAddress);
      const [market] = getMarketPda();

      // Close = opposite direction order
      const isBid = side === "short"; // close short = buy, close long = sell
      const closeSize = positionSol * closingPct;
      const baseAtoms = Math.floor(closeSize * 1e9);

      const priceWithBuffer = isBid
        ? currentPrice * 1.005
        : currentPrice * 0.995;
      const priceMantissa = Math.round(priceWithBuffer * 100);

      const batchIx = buildBatchUpdate(publicKey, market, {
        traderIndexHint: null,
        cancels: [],
        orders: [{
          baseAtoms,
          priceMantissa,
          priceExponent: -5,
          isBid,
          lastValidSlot: 0,
          orderType: OrderType.ImmediateOrCancel,
        }],
      });

      const tx = new Transaction();
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
      tx.add(batchIx);

      const { blockhash } = await magicblockConnection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const sig = await sendTransaction(tx, magicblockConnection);
      console.log(`[close] ${closingPct * 100}% close tx:`, sig);

      sheetRef.current?.close();
      setClosingPct(null);
      await refreshBalance();
    } catch (err) {
      console.error("[close] error:", err);
      Alert.alert("Close Failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [walletAddress, hasPosition, currentPrice, closingPct, side, positionSol, sendTransaction, magicblockConnection, refreshBalance]);

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
              Available Margin
            </Text>
            <Text className="font-space text-sm text-qban-smoke">
              {formatUsd(marginUsd)}
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

          {hasPosition ? (
            <View className="bg-qban-charcoal border border-qban-tan/10 rounded-2xl p-4">
              {/* Header */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <Text className="font-dm-bold text-base text-qban-white">
                    SOL/USD
                  </Text>
                  <View
                    className={`rounded-full px-2 py-0.5 ${
                      side === "long"
                        ? "bg-qban-green/15"
                        : "bg-qban-red/15"
                    }`}
                  >
                    <Text
                      className={`font-space text-xs ${
                        side === "long"
                          ? "text-qban-green"
                          : "text-qban-red"
                      }`}
                    >
                      {side === "long" ? "LONG" : "SHORT"}
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
                    {positionSol.toFixed(4)} SOL
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-dm text-sm text-qban-smoke-dark">
                    Entry
                  </Text>
                  <Text className="font-space text-sm text-qban-white">
                    {entryPrice > 0 ? formatUsd(entryPrice) : "—"}
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
                    Margin
                  </Text>
                  <Text className="font-space text-sm text-qban-white">
                    {formatUsd(marginUsd)}
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

        {/* Deposit/Withdraw */}
        <View className="px-6 mt-4">
          <View className="flex-row gap-3">
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

        {/* Trade History */}
        <View className="px-6 mt-4">
          <View className="flex-row items-center my-3">
            <View className="flex-1 h-px bg-qban-charcoal" />
            <Text className="font-space text-xs text-qban-smoke-dark mx-4 uppercase tracking-widest">
              History
            </Text>
            <View className="flex-1 h-px bg-qban-charcoal" />
          </View>

          {groupedFills.length > 0 ? (
            groupedFills.map((group) => (
              <View key={group.date} className="mb-4">
                <Text className="font-dm-medium text-xs text-qban-smoke-dark mb-2">
                  {group.date}
                </Text>
                {group.items.map((fill, index) => {
                  const fillSizeSol = baseAtomsToSol(fill.baseAtoms);
                  return (
                    <View
                      key={`${fill.orderId}-${index}`}
                      className="flex-row items-center justify-between py-2.5 border-b border-qban-charcoal"
                    >
                      <View className="flex-row items-center gap-2">
                        <Text className={`text-sm ${fill.isBid ? "text-qban-green" : "text-qban-red"}`}>
                          {fill.isBid ? "\u25B2" : "\u25BC"}
                        </Text>
                        <View>
                          <Text className="font-dm text-sm text-qban-white">
                            SOL {fill.isBid ? "UP" : "DOWN"}
                          </Text>
                          <Text className="font-dm text-xs text-qban-smoke-dark">
                            {fillSizeSol.toFixed(3)} SOL @{" "}
                            {formatUsd(fill.price)}
                          </Text>
                        </View>
                      </View>
                      <Text className="font-dm text-xs text-qban-smoke-dark">
                        {formatTime(fill.blockTime)}
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

          {closingPct && hasPosition && (
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
                    positionSol *
                      closingPct *
                      (currentPrice ?? entryPrice)
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
                    {(positionSol * (1 - closingPct)).toFixed(4)} SOL
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
