import { useState, useEffect, useCallback, useRef } from "react";
import { AppState } from "react-native";
import { PublicKey } from "@solana/web3.js";
import { useAuth } from "../providers/AuthProvider";
import { useConnections } from "../providers/ConnectionProvider";
import { getMarginBalance, type PerpsPosition } from "../solana/market-instructions";

const REFRESH_INTERVAL = 10_000; // 10 seconds

export function useMarginBalance() {
  const { walletAddress } = useAuth();
  const { magicblockConnection } = useConnections();
  const [position, setPosition] = useState<PerpsPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const refresh = useCallback(async () => {
    if (!walletAddress) {
      setPosition(null);
      setLoading(false);
      return;
    }
    try {
      const pubkey = new PublicKey(walletAddress);
      const result = await getMarginBalance(magicblockConnection, pubkey);
      setPosition(result);
    } catch (err) {
      console.error("[useMarginBalance] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, magicblockConnection]);

  useEffect(() => {
    refresh();

    intervalRef.current = setInterval(() => {
      if (AppState.currentState === "active") {
        refresh();
      }
    }, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  return {
    position,
    marginUsd: position?.marginUsd ?? 0,
    loading,
    refresh,
  };
}
