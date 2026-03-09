import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import Slider from "@react-native-community/slider";
import Toast from "react-native-toast-message";
import { Chart } from "../../src/components/Chart";
import ProfileSetupSheet from "../../src/components/ProfileSetupSheet";
import { useAuth } from "../../src/providers/AuthProvider";
import {
  hasCompletedProfile,
  hasProfilePromptBeenShown,
  setHasTraded,
  setProfilePromptShown,
} from "../../src/services/profileStorage";
import { usePythPrice } from "../../src/hooks/usePythPrice";
import { useUsdcBalance } from "../../src/hooks/useUsdcBalance";
import { fetchCandles, type BinanceCandle } from "../../src/api/binance";
import {
  DEFAULT_LEVERAGE,
  LEVERAGE_PRESETS,
  BALANCE_PRESETS,
  MAX_LEVERAGE_NEW_USER,
} from "../../src/constants";
import type { CandleData } from "../../src/types";

function formatUsd(v: number): string {
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Direction = "long" | "short";

export default function TradeScreen() {
  const { market } = useLocalSearchParams<{ market: string }>();
  const baseToken = market?.split("/")?.[0] ?? "SOL";

  // ─── Auth & Balance ────────────────────────────────────────
  const { walletAddress } = useAuth();
  const { balance } = useUsdcBalance(walletAddress);

  // ─── Price ──────────────────────────────────────────────────
  const { price: pythPrice } = usePythPrice();
  const currentPrice = pythPrice ?? 0;

  // ─── Chart ──────────────────────────────────────────────────
  const [candles, setCandles] = useState<CandleData[]>([]);

  useEffect(() => {
    fetchCandles(baseToken, "1m", 200).then((data) => {
      setCandles(
        data.map((c: BinanceCandle) => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    });
  }, [baseToken]);

  // Build live candle from Pyth price
  const liveCandle = useMemo<CandleData | undefined>(() => {
    if (!currentPrice || candles.length === 0) return undefined;
    const lastCandle = candles[candles.length - 1];
    return {
      time: lastCandle.time,
      open: lastCandle.open,
      high: Math.max(lastCandle.high, currentPrice),
      low: Math.min(lastCandle.low, currentPrice),
      close: currentPrice,
    };
  }, [currentPrice, candles]);

  // ─── Trade form ─────────────────────────────────────────────
  const [direction, setDirection] = useState<Direction>("long");
  const [amountStr, setAmountStr] = useState("");
  const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);
  const [submitting, setSubmitting] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  const amount = parseFloat(amountStr) || 0;
  const positionSize = amount * leverage;
  const estFee = positionSize * 0.001; // 0.1% taker fee estimate

  const liquidationPrice = useMemo(() => {
    if (!currentPrice || leverage <= 0) return 0;
    const liqMove = currentPrice / leverage;
    return direction === "long"
      ? currentPrice - liqMove
      : currentPrice + liqMove;
  }, [currentPrice, leverage, direction]);

  const liqDropPercent = useMemo(() => {
    if (!currentPrice || leverage <= 0) return 0;
    return (100 / leverage).toFixed(1);
  }, [currentPrice, leverage]);

  const canSubmit = amount > 0 && currentPrice > 0;

  // ─── Bottom sheet ───────────────────────────────────────────
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["50%"], []);

  const openConfirmSheet = useCallback(() => {
    sheetRef.current?.snapToIndex(0);
  }, []);

  const closeConfirmSheet = useCallback(() => {
    sheetRef.current?.close();
  }, []);

  const handleConfirm = useCallback(async () => {
    setSubmitting(true);
    try {
      // TODO: Build and send Anchor instruction via session key
      closeConfirmSheet();
      setAmountStr("");
      Toast.show({
        type: "success",
        text1: "Trade Submitted",
        text2: `${direction === "long" ? "Long" : "Short"} ${formatUsd(positionSize)} at ${leverage}x`,
        visibilityTime: 3000,
      });

      // After first trade, prompt profile setup if not already done
      await setHasTraded();
      const [profileDone, promptShown] = await Promise.all([
        hasCompletedProfile(),
        hasProfilePromptBeenShown(),
      ]);
      if (!profileDone && !promptShown) {
        setTimeout(() => setShowProfileSetup(true), 1500);
      }
    } catch {
      Toast.show({
        type: "error",
        text1: "Trade Failed",
        text2: "Please try again.",
        visibilityTime: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  }, [direction, positionSize, leverage, closeConfirmSheet]);

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
          {market ?? "SOL/USD"}
        </Text>
        <Text className="font-space text-base text-qban-white">
          {currentPrice ? formatUsd(currentPrice) : "—"}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        keyboardShouldPersistTaps="handled"
      >
        {/* Chart */}
        <View className="px-4 mb-4">
          <Chart candles={candles} liveCandle={liveCandle} height={280} />
        </View>

        {/* Direction Picker */}
        <View className="px-4 mb-4">
          <Text className="font-dm-medium text-sm text-qban-smoke-dark mb-2">
            Direction
          </Text>
          <View className="flex-row gap-3">
            <Pressable
              className={`flex-1 rounded-xl py-3.5 items-center border ${
                direction === "long"
                  ? "bg-qban-green/15 border-qban-green"
                  : "bg-qban-charcoal border-qban-tan/10"
              }`}
              onPress={() => setDirection("long")}
            >
              <Text
                className={`font-dm-bold text-base ${
                  direction === "long" ? "text-qban-green" : "text-qban-smoke-dark"
                }`}
              >
                Up (Long)
              </Text>
            </Pressable>
            <Pressable
              className={`flex-1 rounded-xl py-3.5 items-center border ${
                direction === "short"
                  ? "bg-qban-red/15 border-qban-red"
                  : "bg-qban-charcoal border-qban-tan/10"
              }`}
              onPress={() => setDirection("short")}
            >
              <Text
                className={`font-dm-bold text-base ${
                  direction === "short" ? "text-qban-red" : "text-qban-smoke-dark"
                }`}
              >
                Down (Short)
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Amount Input */}
        <View className="px-4 mb-4">
          <Text className="font-dm-medium text-sm text-qban-smoke-dark mb-2">
            Amount (USD)
          </Text>
          <TextInput
            className="bg-qban-charcoal border border-qban-tan/10 rounded-xl px-4 py-3.5 text-qban-white font-space text-lg"
            placeholder="$0.00"
            placeholderTextColor="#B8B2AA"
            value={amountStr}
            onChangeText={setAmountStr}
            keyboardType="decimal-pad"
          />
          <View className="flex-row gap-2 mt-2">
            {BALANCE_PRESETS.map((pct) => (
              <Pressable
                key={pct}
                className="flex-1 bg-qban-charcoal border border-qban-tan/10 rounded-lg py-2 items-center active:opacity-80"
                onPress={() => {
                  if (balance > 0) {
                    setAmountStr((balance * pct).toFixed(2));
                  }
                }}
              >
                <Text className="font-space text-xs text-qban-smoke-dark">
                  {pct === 1 ? "Max" : `${pct * 100}%`}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text className="font-dm text-xs text-qban-smoke-dark mt-1.5">
            Balance: {formatUsd(balance)}
          </Text>
        </View>

        {/* Multiplier */}
        <View className="px-4 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-dm-medium text-sm text-qban-smoke-dark">
              Multiplier
            </Text>
            <Text className="font-space text-sm text-qban-yellow">
              {leverage}x
            </Text>
          </View>
          <View className="flex-row gap-2 mb-2">
            {LEVERAGE_PRESETS.map((preset) => (
              <Pressable
                key={preset}
                className={`flex-1 rounded-lg py-2.5 items-center border ${
                  leverage === preset
                    ? "bg-qban-yellow/15 border-qban-yellow"
                    : "bg-qban-charcoal border-qban-tan/10"
                }`}
                onPress={() => setLeverage(preset)}
              >
                <Text
                  className={`font-space text-sm ${
                    leverage === preset
                      ? "text-qban-yellow"
                      : "text-qban-smoke-dark"
                  }`}
                >
                  {preset}x
                </Text>
              </Pressable>
            ))}
          </View>
          <Slider
            style={{ width: "100%", height: 36 }}
            minimumValue={1}
            maximumValue={MAX_LEVERAGE_NEW_USER}
            step={1}
            value={leverage}
            onValueChange={setLeverage}
            minimumTrackTintColor="#F5C518"
            maximumTrackTintColor="#2D2D2D"
            thumbTintColor="#F5C518"
          />
          {/* Safety: liquidation warning */}
          {leverage > 1 && (
            <View className="bg-qban-red/10 border border-qban-red/20 rounded-lg px-3 py-2 mt-2">
              <Text className="font-dm text-xs text-qban-red">
                Auto-closed if price drops {liqDropPercent}% from entry
              </Text>
            </View>
          )}
        </View>

        {/* Order Summary */}
        <View className="px-4 mb-4">
          <View className="flex-row items-center mb-3">
            <View className="flex-1 h-px bg-qban-charcoal" />
            <Text className="font-space text-xs text-qban-smoke-dark mx-4 uppercase tracking-widest">
              Summary
            </Text>
            <View className="flex-1 h-px bg-qban-charcoal" />
          </View>

          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="font-dm text-sm text-qban-smoke-dark">
                Position Size
              </Text>
              <Text className="font-space text-sm text-qban-white">
                {formatUsd(positionSize)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="font-dm text-sm text-qban-smoke-dark">
                Entry Price
              </Text>
              <Text className="font-space text-sm text-qban-white">
                ~{currentPrice ? formatUsd(currentPrice) : "—"}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="font-dm text-sm text-qban-smoke-dark">
                Liquidation
              </Text>
              <Text className="font-space text-sm text-qban-red">
                ~{liquidationPrice ? formatUsd(liquidationPrice) : "—"}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="font-dm text-sm text-qban-smoke-dark">
                Est. Fee
              </Text>
              <Text className="font-space text-sm text-qban-white">
                ~{formatUsd(estFee)}
              </Text>
            </View>
          </View>

          {/* Balance warning */}
          {balance > 0 && amount > balance * 0.5 && (
            <View className="bg-qban-yellow/10 border border-qban-yellow/20 rounded-lg px-3 py-2 mt-2">
              <Text className="font-dm text-xs text-qban-yellow">
                You're using more than 50% of your balance
              </Text>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <View className="px-4">
          <Pressable
            className={`rounded-xl py-4 items-center ${
              canSubmit
                ? direction === "long"
                  ? "bg-qban-green active:opacity-90"
                  : "bg-qban-red active:opacity-90"
                : "bg-qban-charcoal"
            }`}
            onPress={openConfirmSheet}
            disabled={!canSubmit}
          >
            <Text
              className={`font-dm-bold text-base ${
                canSubmit ? "text-qban-white" : "text-qban-smoke-dark"
              }`}
            >
              {direction === "long" ? "Open Position (Up)" : "Open Position (Down)"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Confirmation Bottom Sheet */}
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
            Confirm Trade
          </Text>

          <View className="gap-3 mb-8">
            <View className="flex-row justify-between">
              <Text className="font-dm text-sm text-qban-smoke-dark">
                Direction
              </Text>
              <Text
                className={`font-dm-bold text-sm ${
                  direction === "long" ? "text-qban-green" : "text-qban-red"
                }`}
              >
                {direction === "long" ? "Up (Long)" : "Down (Short)"}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="font-dm text-sm text-qban-smoke-dark">
                Amount
              </Text>
              <Text className="font-space text-sm text-qban-white">
                {formatUsd(amount)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="font-dm text-sm text-qban-smoke-dark">
                Multiplier
              </Text>
              <Text className="font-space text-sm text-qban-yellow">
                {leverage}x
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="font-dm text-sm text-qban-smoke-dark">
                Position Size
              </Text>
              <Text className="font-space text-sm text-qban-white">
                {formatUsd(positionSize)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="font-dm text-sm text-qban-smoke-dark">
                Entry Price
              </Text>
              <Text className="font-space text-sm text-qban-white">
                ~{formatUsd(currentPrice)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="font-dm text-sm text-qban-smoke-dark">
                Liquidation
              </Text>
              <Text className="font-space text-sm text-qban-red">
                ~{formatUsd(liquidationPrice)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="font-dm text-sm text-qban-smoke-dark">
                Fee
              </Text>
              <Text className="font-space text-sm text-qban-white">
                ~{formatUsd(estFee)}
              </Text>
            </View>
          </View>

          <Pressable
            className={`rounded-xl py-4 items-center mb-3 ${
              direction === "long"
                ? "bg-qban-green active:opacity-90"
                : "bg-qban-red active:opacity-90"
            }`}
            onPress={handleConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="font-dm-bold text-base text-qban-white">
                Confirm Trade
              </Text>
            )}
          </Pressable>

          <Pressable
            className="py-3 items-center"
            onPress={closeConfirmSheet}
          >
            <Text className="font-dm text-sm text-qban-smoke-dark">
              Cancel
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
      <ProfileSetupSheet
        visible={showProfileSetup}
        onDismiss={() => {
          setShowProfileSetup(false);
          setProfilePromptShown();
        }}
        onSaved={() => {
          setShowProfileSetup(false);
          setProfilePromptShown();
          Toast.show({
            type: "success",
            text1: "Profile Saved",
            text2: "Your trader identity is live!",
            visibilityTime: 2000,
          });
        }}
      />
    </SafeAreaView>
  );
}
