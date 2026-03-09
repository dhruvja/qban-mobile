import React, { createContext, useContext, useMemo } from "react";
import { usePrivy } from "@privy-io/expo";
import { useUnifiedWallet, WalletType } from "./UnifiedWalletProvider";

// Toggle this to skip auth for testing UI screens
const DEV_SKIP_AUTH = __DEV__ && true;

interface AuthContextValue {
  /** Whether the auth system is ready */
  isReady: boolean;
  /** Whether a user is authenticated (via Privy or MWA) */
  isAuthenticated: boolean;
  /** Privy user object (null when using MWA or logged out) */
  user: ReturnType<typeof usePrivy>["user"];
  /** Solana wallet address (null until wallet is connected) */
  walletAddress: string | null;
  /** Which wallet type is connected */
  walletType: WalletType;
  /** Log the current user out */
  logout: () => Promise<void>;
  /** Get a fresh Privy access token (null for MWA users) */
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isReady: privyReady, getAccessToken } = usePrivy();
  const {
    publicKey,
    connected,
    walletType,
    disconnect,
  } = useUnifiedWallet();

  const isReady = DEV_SKIP_AUTH ? true : privyReady;
  const isAuthenticated = DEV_SKIP_AUTH ? true : connected;

  const walletAddress = DEV_SKIP_AUTH
    ? "DRpbCBMxVnDK7maPMoGQfFaCRJCPY1tGoHW9TRcpcbhA"
    : publicKey;

  const logout = async () => {
    await disconnect();
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      isAuthenticated,
      user: DEV_SKIP_AUTH ? ({} as ReturnType<typeof usePrivy>["user"]) : user,
      walletAddress,
      walletType: DEV_SKIP_AUTH ? "privy" : walletType,
      logout,
      getAccessToken,
    }),
    [isReady, isAuthenticated, user, walletAddress, walletType, disconnect, getAccessToken]
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
