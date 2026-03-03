import { View, Text, Pressable, ScrollView, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useAuth } from "../../src/providers/AuthProvider";
import { useState } from "react";

function SettingsRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      className="flex-row items-center justify-between py-3.5 border-b border-qban-charcoal active:opacity-80"
      onPress={onPress}
      disabled={!onPress}
    >
      <Text className="font-dm text-base text-qban-white">{label}</Text>
      {value && (
        <Text className="font-space text-sm text-qban-smoke-dark">
          {value}
        </Text>
      )}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View className="flex-row items-center mt-6 mb-2">
      <View className="flex-1 h-px bg-qban-charcoal" />
      <Text className="font-space text-xs text-qban-smoke-dark mx-4 uppercase tracking-widest">
        {title}
      </Text>
      <View className="flex-1 h-px bg-qban-charcoal" />
    </View>
  );
}

export default function MoreScreen() {
  const { walletAddress, logout } = useAuth();
  const [referralCopied, setReferralCopied] = useState(false);

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "—";

  // Generate a simple referral code from wallet address
  const referralCode = walletAddress
    ? `QBAN-${walletAddress.slice(0, 6).toUpperCase()}`
    : "";

  const handleCopyReferral = async () => {
    await Clipboard.setStringAsync(referralCode);
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2000);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-qban-black" edges={["top"]}>
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <Text className="font-bebas text-3xl text-qban-white tracking-wider">
            Account
          </Text>
        </View>

        {/* Profile Section */}
        <View className="items-center py-6">
          <View className="w-16 h-16 rounded-full bg-qban-charcoal items-center justify-center mb-3">
            <Text className="font-dm-bold text-xl text-qban-yellow">
              {walletAddress?.slice(0, 2).toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text className="font-space text-base text-qban-white">
            {shortAddr}
          </Text>
        </View>

        <View className="px-6">
          {/* Funds */}
          <SectionHeader title="Funds" />
          <SettingsRow
            label="Deposit"
            onPress={() => router.push("/deposit" as never)}
          />
          <SettingsRow
            label="Withdraw"
            onPress={() => router.push("/withdraw" as never)}
          />

          {/* Refer & Earn */}
          <SectionHeader title="Refer & Earn" />
          <View className="bg-qban-charcoal border border-qban-tan/10 rounded-2xl p-4 mt-2">
            <Text className="font-dm text-sm text-qban-smoke mb-2">
              Share your referral code and earn rewards when friends trade.
            </Text>
            <View className="flex-row items-center justify-between">
              <Text className="font-space text-base text-qban-yellow">
                {referralCode}
              </Text>
              <Pressable
                className={`rounded-lg px-4 py-2 ${
                  referralCopied ? "bg-qban-green/20" : "bg-qban-yellow"
                }`}
                onPress={handleCopyReferral}
              >
                <Text
                  className={`font-dm-bold text-xs ${
                    referralCopied ? "text-qban-green" : "text-qban-black"
                  }`}
                >
                  {referralCopied ? "Copied!" : "Copy"}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Settings */}
          <SectionHeader title="Settings" />
          <SettingsRow label="1-Click Trading" value="Off" />
          <SettingsRow label="Trade Visibility" value="Public" />

          {/* Support */}
          <SectionHeader title="Support" />
          <SettingsRow
            label="Help & FAQ"
            onPress={() =>
              Linking.openURL("https://qban.trade")
            }
          />
          <SettingsRow label="Terms of Service" />
          <SettingsRow label="Privacy Policy" />

          {/* Sign Out */}
          <Pressable
            className="bg-qban-red/10 border border-qban-red/20 rounded-xl py-4 items-center mt-8"
            onPress={handleSignOut}
          >
            <Text className="font-dm-bold text-base text-qban-red">
              Sign Out
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
