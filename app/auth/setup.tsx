import { useEffect, useState, useRef } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { PublicKey } from "@solana/web3.js";
import { useAuth } from "../../src/providers/AuthProvider";
import { useConnections } from "../../src/providers/ConnectionProvider";
import { getMarginBalance } from "../../src/solana/market-instructions";
import { getTokenBalance, airdropUsdc, depositFlow } from "../../src/solana/deposit-instructions";
import { AIRDROP_AMOUNT } from "../../src/solana/constants";
import { useUnifiedWallet } from "../../src/providers/UnifiedWalletProvider";

type SetupStep =
  | "checking_balance"
  | "airdropping"
  | "depositing"
  | "done"
  | "error";

export default function SetupScreen() {
  const { walletAddress } = useAuth();
  const { devnetConnection, magicblockConnection } = useConnections();
  const { signTransaction } = useUnifiedWallet();
  const [step, setStep] = useState<SetupStep>("checking_balance");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!walletAddress || started.current) return;
    started.current = true;

    runSetup().catch((err) => {
      console.error("[setup] Error:", err);
      setError(err instanceof Error ? err.message : String(err));
      setStep("error");
    });
  }, [walletAddress]);

  async function runSetup() {
    const pubkey = new PublicKey(walletAddress!);

    // Step 1: Check platform balance
    setStep("checking_balance");
    const position = await getMarginBalance(magicblockConnection, pubkey);
    console.log("[setup] Margin balance:", position?.marginUsd ?? 0);

    if (position && position.marginUsd > 0) {
      setStep("done");
      router.replace("/(tabs)");
      return;
    }

    // Step 2: Check wallet token balance
    const tokenBalance = await getTokenBalance(pubkey, devnetConnection);
    console.log("[setup] Token balance:", tokenBalance);

    let depositAmount: number;

    if (tokenBalance === 0) {
      // Step 3: Airdrop tokens — use known amount since balance may lag
      setStep("airdropping");
      await airdropUsdc({ publicKey: pubkey, devnetConnection });
      console.log("[setup] Airdrop complete (100 USDC)");
      depositAmount = AIRDROP_AMOUNT; // 100_000_000 atoms
    } else {
      depositAmount = Math.floor(tokenBalance * 1_000_000);
    }

    console.log("[setup] Deposit amount:", depositAmount, "atoms");

    // Step 4: Deposit into platform
    setStep("depositing");
    const results = await depositFlow({
      publicKey: pubkey,
      devnetConnection,
      magicblockConnection,
      amount: depositAmount,
      signTransaction,
    });
    console.log("[setup] Deposit results:", results);

    setStep("done");
    router.replace("/(tabs)");
  }

  const stepMessages: Record<SetupStep, string> = {
    checking_balance: "Checking your balance...",
    airdropping: "Setting up your account...",
    depositing: "Depositing funds...",
    done: "All set!",
    error: "Something went wrong",
  };

  return (
    <SafeAreaView className="flex-1 bg-qban-black">
      <View className="flex-1 justify-center items-center px-8">
        <View className="items-center mb-8">
          <Text className="font-bebas text-4xl text-qban-yellow tracking-widest mb-2">
            QBAN
          </Text>
        </View>

        {step !== "error" ? (
          <>
            <ActivityIndicator color="#F5C518" size="large" />
            <Text className="font-dm text-base text-qban-white mt-6 text-center">
              {stepMessages[step]}
            </Text>
            <Text className="font-dm text-xs text-qban-smoke-dark mt-2 text-center">
              This only takes a moment
            </Text>
          </>
        ) : (
          <>
            <Text className="font-dm text-base text-qban-red text-center">
              {error}
            </Text>
            <Text
              className="font-dm text-sm text-qban-yellow mt-4 text-center"
              onPress={() => {
                started.current = false;
                setStep("checking_balance");
                setError(null);
              }}
            >
              Tap to retry
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
