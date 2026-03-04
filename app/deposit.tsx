import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import { useAuth } from "../src/providers/AuthProvider";

export default function DepositScreen() {
  const { walletAddress } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!walletAddress) return;
    await Clipboard.setStringAsync(walletAddress);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SafeAreaView className="flex-1 bg-qban-black" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text className="font-dm text-base text-qban-smoke-dark">
            {"← Back"}
          </Text>
        </Pressable>
        <Text className="font-dm-bold text-lg text-qban-white">Deposit</Text>
        <View style={{ width: 50 }} />
      </View>

      <View className="flex-1 justify-center px-8">
        {/* Instructions */}
        <View className="items-center mb-8">
          <Text className="font-bebas text-3xl text-qban-yellow tracking-wider mb-2">
            Fund Your Account
          </Text>
          <Text className="font-dm text-sm text-qban-smoke-dark text-center leading-5">
            Send USDC (Solana) to the address below.{"\n"}Your balance will
            update automatically.
          </Text>
        </View>

        {/* Network Badge */}
        <View className="items-center mb-6">
          <View className="bg-qban-charcoal border border-qban-tan/20 rounded-full px-4 py-1.5">
            <Text className="font-space text-xs text-qban-smoke-dark uppercase tracking-widest">
              Solana Devnet · USDC
            </Text>
          </View>
        </View>

        {/* QR Code */}
        {walletAddress && (
          <View className="items-center mb-6">
            <View className="bg-white p-4 rounded-2xl">
              <QRCode
                value={walletAddress}
                size={180}
                backgroundColor="white"
                color="#1A1A1A"
              />
            </View>
          </View>
        )}

        {/* Address Card */}
        <View className="bg-qban-charcoal border border-qban-tan/10 rounded-2xl p-5 mb-6">
          <Text className="font-dm text-xs text-qban-smoke-dark mb-2">
            Your Wallet Address
          </Text>
          <Text
            className="font-space text-sm text-qban-white leading-5"
            selectable
          >
            {walletAddress ?? "Connect wallet to see address"}
          </Text>
        </View>

        {/* Copy Button */}
        <Pressable
          className={`rounded-xl py-4 items-center ${
            copied
              ? "bg-qban-green/20 border border-qban-green/30"
              : "bg-qban-yellow active:bg-qban-yellow-light"
          }`}
          onPress={handleCopy}
          disabled={!walletAddress}
        >
          <Text
            className={`font-dm-bold text-base ${
              copied ? "text-qban-green" : "text-qban-black"
            }`}
          >
            {copied ? "Copied!" : "Copy Address"}
          </Text>
        </Pressable>

        {/* Warning */}
        <View className="bg-qban-red/10 border border-qban-red/20 rounded-lg px-4 py-3 mt-6">
          <Text className="font-dm text-xs text-qban-red text-center">
            Only send USDC on Solana network. Sending other tokens or using
            the wrong network may result in permanent loss.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
