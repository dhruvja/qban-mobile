import { useRef, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";

function formatUsd(v: number): string {
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function WithdrawScreen() {
  const [amountStr, setAmountStr] = useState("");
  const [destination, setDestination] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const amount = parseFloat(amountStr) || 0;
  const balance = 0; // TODO: fetch from chain
  const canSubmit =
    amount > 0 && amount <= balance && destination.length > 30;

  // ─── Confirmation Sheet ─────────────────────────────────────
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["40%"], []);

  const openConfirmSheet = useCallback(() => {
    sheetRef.current?.snapToIndex(0);
  }, []);

  const handleConfirm = useCallback(async () => {
    setSubmitting(true);
    try {
      // TODO: Build + send withdraw instruction
      Alert.alert("Withdrawal Submitted", `${formatUsd(amount)} USDC sent`);
      sheetRef.current?.close();
      setAmountStr("");
      setDestination("");
      router.back();
    } catch {
      Alert.alert("Withdrawal Failed", "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [amount]);

  return (
    <SafeAreaView className="flex-1 bg-qban-black" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text className="font-dm text-base text-qban-smoke-dark">
            {"← Back"}
          </Text>
        </Pressable>
        <Text className="font-dm-bold text-lg text-qban-white">Withdraw</Text>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 justify-center px-8">
          {/* Amount */}
          <View className="mb-6">
            <Text className="font-dm-medium text-sm text-qban-smoke-dark mb-2">
              Amount (USDC)
            </Text>
            <TextInput
              className="bg-qban-charcoal border border-qban-tan/10 rounded-xl px-4 py-4 text-qban-white font-space text-lg"
              placeholder="$0.00"
              placeholderTextColor="#B8B2AA"
              value={amountStr}
              onChangeText={setAmountStr}
              keyboardType="decimal-pad"
            />
            <Text className="font-dm text-xs text-qban-smoke-dark mt-1.5">
              Available: {formatUsd(balance)}
            </Text>
          </View>

          {/* Destination */}
          <View className="mb-6">
            <Text className="font-dm-medium text-sm text-qban-smoke-dark mb-2">
              Destination Address
            </Text>
            <TextInput
              className="bg-qban-charcoal border border-qban-tan/10 rounded-xl px-4 py-4 text-qban-white font-space text-sm"
              placeholder="Paste Solana address..."
              placeholderTextColor="#B8B2AA"
              value={destination}
              onChangeText={setDestination}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Network */}
          <View className="items-center mb-6">
            <View className="bg-qban-charcoal border border-qban-tan/20 rounded-full px-4 py-1.5">
              <Text className="font-space text-xs text-qban-smoke-dark uppercase tracking-widest">
                Solana Devnet · USDC
              </Text>
            </View>
          </View>

          {/* Submit */}
          <Pressable
            className={`rounded-xl py-4 items-center ${
              canSubmit
                ? "bg-qban-yellow active:bg-qban-yellow-light"
                : "bg-qban-charcoal"
            }`}
            onPress={openConfirmSheet}
            disabled={!canSubmit}
          >
            <Text
              className={`font-dm-bold text-base ${
                canSubmit ? "text-qban-black" : "text-qban-smoke-dark"
              }`}
            >
              Review Withdrawal
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

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
            Confirm Withdrawal
          </Text>

          <View className="gap-3 mb-8">
            <View className="flex-row justify-between">
              <Text className="font-dm text-sm text-qban-smoke-dark">
                Amount
              </Text>
              <Text className="font-space text-sm text-qban-white">
                {formatUsd(amount)} USDC
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="font-dm text-sm text-qban-smoke-dark">To</Text>
              <Text className="font-space text-xs text-qban-smoke">
                {destination.slice(0, 8)}...{destination.slice(-4)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="font-dm text-sm text-qban-smoke-dark">
                Network
              </Text>
              <Text className="font-space text-sm text-qban-white">
                Solana
              </Text>
            </View>
          </View>

          <Pressable
            className="bg-qban-yellow rounded-xl py-4 items-center mb-3 active:bg-qban-yellow-light"
            onPress={handleConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#1A1A1A" size="small" />
            ) : (
              <Text className="font-dm-bold text-base text-qban-black">
                Confirm
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
