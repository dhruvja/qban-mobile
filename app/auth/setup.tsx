import { useEffect, useState, useRef } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { PublicKey } from "@solana/web3.js";
import { useAuth } from "../../src/providers/AuthProvider";
import { useConnections } from "../../src/providers/ConnectionProvider";
import { getMarginBalance } from "../../src/solana/market-instructions";
import { getTokenBalance, getSolBalance, airdropUsdc, airdropSol, depositFlow } from "../../src/solana/deposit-instructions";
import { AIRDROP_AMOUNT } from "../../src/solana/constants";
import { useUnifiedWallet } from "../../src/providers/UnifiedWalletProvider";
import { hasCompletedProfile } from "../../src/services/profileStorage";
import ProfileSetupSheet from "../../src/components/ProfileSetupSheet";

type SetupStep =
  | "checking_balance"
  | "ready_to_deposit"
  | "airdropping"
  | "depositing"
  | "profile"
  | "done"
  | "error";

export default function SetupScreen() {
  const { walletAddress } = useAuth();
  const { devnetConnection, magicblockConnection } = useConnections();
  const { signTransaction, sendTransaction } = useUnifiedWallet();
  const [step, setStep] = useState<SetupStep>("checking_balance");
  const [error, setError] = useState<string | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!walletAddress || started.current) return;
    started.current = true;

    checkBalance().catch((err) => {
      console.error("[setup] Error:", err);
      setError(err instanceof Error ? err.message : String(err));
      setStep("error");
    });
  }, [walletAddress]);

  /** Phase 1: Check balances and airdrop if needed (no wallet signing) */
  async function checkBalance() {
    const pubkey = new PublicKey(walletAddress!);

    setStep("checking_balance");
    const position = await getMarginBalance(magicblockConnection, pubkey);
    console.log("[setup] Margin balance:", position?.marginUsd ?? 0);

    if (position && position.marginUsd > 0) {
      await promptProfileIfNeeded();
      return;
    }

    const [tokenBalance, solBalance] = await Promise.all([
      getTokenBalance(pubkey, devnetConnection),
      getSolBalance(pubkey, devnetConnection),
    ]);
    console.log("[setup] Token balance:", tokenBalance, "SOL lamports:", solBalance);

    const needsUsdc = tokenBalance === 0;
    const needsSol = solBalance < 5_000_000; // < 0.005 SOL

    if (needsUsdc || needsSol) {
      setStep("airdropping");
      const airdrops: Promise<string>[] = [];
      if (needsUsdc) {
        airdrops.push(airdropUsdc({ publicKey: pubkey, devnetConnection }));
      }
      if (needsSol) {
        airdrops.push(airdropSol({ publicKey: pubkey, devnetConnection }));
      }
      await Promise.all(airdrops);
      console.log("[setup] Airdrop complete — USDC:", needsUsdc, "SOL:", needsSol);
    }

    const amount = needsUsdc
      ? AIRDROP_AMOUNT
      : Math.floor(tokenBalance * 1_000_000);

    setDepositAmount(amount);
    setStep("ready_to_deposit");
  }

  /** Phase 2: Deposit — triggered by user tap (opens wallet for signing) */
  async function runDeposit() {
    try {
      const pubkey = new PublicKey(walletAddress!);
      setStep("depositing");
      const results = await depositFlow({
        publicKey: pubkey,
        devnetConnection,
        magicblockConnection,
        amount: depositAmount,
        signTransaction,
        sendTransaction,
      });
      console.log("[setup] Deposit results:", results);
      await promptProfileIfNeeded();
    } catch (err) {
      console.error("[setup] Deposit error:", err);
      setError(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }

  async function promptProfileIfNeeded() {
    const profileDone = await hasCompletedProfile(walletAddress!);
    if (profileDone) {
      setStep("done");
      router.replace("/(tabs)");
    } else {
      setStep("profile");
      setShowProfileSetup(true);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-qban-black">
      <View className="flex-1 justify-center items-center px-8">
        <View className="items-center mb-8">
          <Text className="font-bebas text-4xl text-qban-yellow tracking-widest mb-2">
            QBAN
          </Text>
        </View>

        {(step === "checking_balance" || step === "airdropping") && (
          <>
            <ActivityIndicator color="#F5C518" size="large" />
            <Text className="font-dm text-base text-qban-white mt-6 text-center">
              {step === "airdropping"
                ? "Setting up your account..."
                : "Checking your balance..."}
            </Text>
            <Text className="font-dm text-xs text-qban-smoke-dark mt-2 text-center">
              This only takes a moment
            </Text>
          </>
        )}

        {step === "ready_to_deposit" && (
          <>
            <Text className="font-dm text-base text-qban-white mb-2 text-center">
              Your account is ready!
            </Text>
            <Text className="font-dm text-sm text-qban-smoke-dark mb-8 text-center">
              Tap below to deposit funds. Your wallet will open for approval.
            </Text>
            <Pressable
              className="bg-qban-yellow rounded-xl px-8 py-4 active:bg-qban-yellow-light"
              onPress={runDeposit}
            >
              <Text className="font-dm-bold text-base text-qban-black">
                Deposit & Start Trading
              </Text>
            </Pressable>
          </>
        )}

        {step === "depositing" && (
          <>
            <ActivityIndicator color="#F5C518" size="large" />
            <Text className="font-dm text-base text-qban-white mt-6 text-center">
              Depositing funds...
            </Text>
            <Text className="font-dm text-xs text-qban-smoke-dark mt-2 text-center">
              Approve the transaction in your wallet
            </Text>
          </>
        )}

        {step === "profile" && !showProfileSetup && (
          <>
            <ActivityIndicator color="#F5C518" size="large" />
            <Text className="font-dm text-base text-qban-white mt-6 text-center">
              Setting up your profile...
            </Text>
          </>
        )}

        {step === "error" && (
          <>
            <Text className="font-dm text-base text-qban-red text-center">
              {error}
            </Text>
            <Pressable
              className="mt-4"
              onPress={() => {
                started.current = false;
                setStep("checking_balance");
                setError(null);
                checkBalance().catch((err) => {
                  setError(err instanceof Error ? err.message : String(err));
                  setStep("error");
                });
              }}
            >
              <Text className="font-dm text-sm text-qban-yellow text-center">
                Tap to retry
              </Text>
            </Pressable>
          </>
        )}
      </View>

      <ProfileSetupSheet
        visible={showProfileSetup}
        onDismiss={() => {
          setShowProfileSetup(false);
          router.replace("/(tabs)");
        }}
        onSaved={() => {
          setShowProfileSetup(false);
          router.replace("/(tabs)");
        }}
      />
    </SafeAreaView>
  );
}
