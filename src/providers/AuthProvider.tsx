import React, { createContext, useContext, useEffect, useMemo } from "react";
import { usePrivy, useEmbeddedSolanaWallet } from "@privy-io/expo";

// Toggle this to skip auth for testing UI screens
const DEV_SKIP_AUTH = __DEV__ && true;

interface AuthContextValue {
  /** Whether Privy SDK has finished initialising */
  isReady: boolean;
  /** Whether a user is logged in */
  isAuthenticated: boolean;
  /** Privy user object (null when logged out) */
  user: ReturnType<typeof usePrivy>["user"];
  /** Solana wallet address (null until wallet is connected) */
  walletAddress: string | null;
  /** Wallet status from Privy embedded Solana wallet hook */
  walletStatus: string;
  /** Log the current user out */
  logout: () => Promise<void>;
  /** Get a fresh access token for API calls */
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isReady, logout, getAccessToken } = usePrivy();
  const solanaWallet = useEmbeddedSolanaWallet();

  const isAuthenticated = DEV_SKIP_AUTH ? true : isReady && user !== null;

  // Auto-create Solana wallet when user signs up and doesn't have one yet
  useEffect(() => {
    if (DEV_SKIP_AUTH) return;
    if (isAuthenticated && solanaWallet.status === "not-created") {
      solanaWallet.create().catch(() => {
        // Wallet creation failed — will retry on next mount
      });
    }
  }, [isAuthenticated, solanaWallet.status]);

  const walletAddress = useMemo(() => {
    if (DEV_SKIP_AUTH) return "DRpbCBMxVnDK7maPMoGQfFaCRJCPY1tGoHW9TRcpcbhA";
    if (solanaWallet.status === "connected" && solanaWallet.wallets.length > 0) {
      return solanaWallet.wallets[0].address;
    }
    return null;
  }, [solanaWallet.status, solanaWallet.wallets]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady: DEV_SKIP_AUTH ? true : isReady,
      isAuthenticated,
      user: DEV_SKIP_AUTH ? ({} as ReturnType<typeof usePrivy>["user"]) : user,
      walletAddress,
      walletStatus: DEV_SKIP_AUTH ? "connected" : solanaWallet.status,
      logout,
      getAccessToken,
    }),
    [isReady, isAuthenticated, user, walletAddress, solanaWallet.status, logout, getAccessToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
