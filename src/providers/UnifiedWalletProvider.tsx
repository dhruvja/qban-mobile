import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  Connection,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { usePrivy, useEmbeddedSolanaWallet } from "@privy-io/expo";
import { useMWA, getCachedMWAAddress } from "./MWAProvider";

export type WalletType = "mwa" | "privy" | null;

interface UnifiedWalletContextValue {
  /** Which wallet type is connected */
  walletType: WalletType;
  /** Solana public key as string (base58) */
  publicKey: string | null;
  /** Whether any wallet is connected */
  connected: boolean;
  /** Whether we're in the process of connecting */
  connecting: boolean;

  /** Connect via Solana Mobile Wallet Adapter (Phantom/Solflare on device) */
  connectMWA: () => Promise<void>;
  /** Disconnect the current wallet */
  disconnect: () => Promise<void>;

  /** Sign a transaction (without sending) through the connected wallet */
  signTransaction: (transaction: Transaction) => Promise<Transaction>;

  /** Sign and send a transaction through the connected wallet */
  sendTransaction: (
    transaction: Transaction | VersionedTransaction,
    connection: Connection
  ) => Promise<string>;
}

const UnifiedWalletContext = createContext<UnifiedWalletContextValue | null>(
  null
);

export function UnifiedWalletProvider({ children }: { children: ReactNode }) {
  const [walletType, setWalletType] = useState<WalletType>(null);
  const [mwaAddress, setMwaAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // ─── Privy ──────────────────────────────────────────────────
  const { user, isReady: privyReady, logout: privyLogout } = usePrivy();
  const solanaWallet = useEmbeddedSolanaWallet();

  const privyAddress = useMemo(() => {
    if (
      solanaWallet.status === "connected" &&
      solanaWallet.wallets.length > 0
    ) {
      return solanaWallet.wallets[0].address;
    }
    return null;
  }, [solanaWallet.status, solanaWallet.wallets]);

  // Auto-create Privy embedded wallet if needed
  useEffect(() => {
    if (
      privyReady &&
      user &&
      walletType === "privy" &&
      solanaWallet.status === "not-created"
    ) {
      solanaWallet.create().catch(() => {});
    }
  }, [privyReady, user, walletType, solanaWallet.status]);

  // ─── MWA ────────────────────────────────────────────────────
  const { connect: mwaConnect, disconnect: mwaDisconnect, withWallet } = useMWA();

  // Restore cached MWA session on mount
  useEffect(() => {
    getCachedMWAAddress().then((addr) => {
      if (addr && !walletType) {
        setMwaAddress(addr);
        setWalletType("mwa");
      }
    });
  }, []);

  // Detect Privy login (from login screen)
  useEffect(() => {
    if (privyReady && user && walletType === null) {
      setWalletType("privy");
    }
  }, [privyReady, user]);

  // ─── Connect ────────────────────────────────────────────────
  const connectMWA = useCallback(async () => {
    setConnecting(true);
    try {
      // Disconnect Privy if active
      if (walletType === "privy" && user) {
        await privyLogout();
      }
      const address = await mwaConnect();
      setMwaAddress(address);
      setWalletType("mwa");
    } finally {
      setConnecting(false);
    }
  }, [walletType, user, privyLogout, mwaConnect]);

  // ─── Disconnect ─────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    if (walletType === "mwa") {
      await mwaDisconnect();
      setMwaAddress(null);
    } else if (walletType === "privy") {
      await privyLogout();
    }
    setWalletType(null);
  }, [walletType, mwaDisconnect, privyLogout]);

  // ─── Privy wallet helper ────────────────────────────────────
  const getPrivyProvider = useCallback(async () => {
    if (solanaWallet.status !== "connected" || solanaWallet.wallets.length === 0) {
      throw new Error("Privy Solana wallet not connected");
    }
    return solanaWallet.wallets[0].getProvider();
  }, [solanaWallet]);

  // ─── Sign Transaction (sign only, no send) ─────────────────
  const signTransaction = useCallback(
    async (transaction: Transaction): Promise<Transaction> => {
      if (walletType === "mwa") {
        return withWallet(async (wallet, _pubkey) => {
          const signed = await wallet.signTransactions({
            transactions: [transaction],
          });
          return signed[0];
        });
      } else if (walletType === "privy") {
        const provider = await getPrivyProvider();
        const { signedTransaction } = await provider.request({
          method: "signTransaction",
          params: { transaction },
        });
        return signedTransaction;
      }
      throw new Error("No wallet connected");
    },
    [walletType, withWallet, getPrivyProvider]
  );

  // ─── Send Transaction ───────────────────────────────────────
  const sendTransaction = useCallback(
    async (
      transaction: Transaction | VersionedTransaction,
      connection: Connection
    ): Promise<string> => {
      if (walletType === "mwa") {
        return withWallet(async (wallet, _pubkey) => {
          const signatures = await wallet.signAndSendTransactions({
            transactions: [transaction],
          });
          const sig = signatures[0];
          if (!sig) throw new Error("No signature returned");
          return sig;
        });
      } else if (walletType === "privy") {
        const provider = await getPrivyProvider();
        const { signature } = await provider.request({
          method: "signAndSendTransaction",
          params: { transaction, connection },
        });
        return signature;
      }
      throw new Error("No wallet connected");
    },
    [walletType, withWallet, getPrivyProvider]
  );

  // ─── Derived state ─────────────────────────────────────────
  const publicKey = useMemo(() => {
    if (walletType === "mwa") return mwaAddress;
    if (walletType === "privy") return privyAddress;
    return null;
  }, [walletType, mwaAddress, privyAddress]);

  const connected = walletType !== null && publicKey !== null;

  const value = useMemo<UnifiedWalletContextValue>(
    () => ({
      walletType,
      publicKey,
      connected,
      connecting,
      connectMWA,
      disconnect,
      signTransaction,
      sendTransaction,
    }),
    [
      walletType,
      publicKey,
      connected,
      connecting,
      connectMWA,
      disconnect,
      signTransaction,
      sendTransaction,
    ]
  );

  return (
    <UnifiedWalletContext.Provider value={value}>
      {children}
    </UnifiedWalletContext.Provider>
  );
}

export function useUnifiedWallet() {
  const ctx = useContext(UnifiedWalletContext);
  if (!ctx) {
    throw new Error(
      "useUnifiedWallet must be used within UnifiedWalletProvider"
    );
  }
  return ctx;
}
