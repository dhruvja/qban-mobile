import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { PublicKey } from "@solana/web3.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  transact,
  Web3MobileWallet,
} from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { toByteArray } from "base64-js";

const AUTH_TOKEN_KEY = "qban_mwa_auth_token";
const WALLET_KEY = "qban_mwa_wallet_address";

/** MWA returns addresses as base64 — convert to base58 via PublicKey */
function toBase58Address(base64Address: string): string {
  const bytes = toByteArray(base64Address);
  return new PublicKey(bytes).toBase58();
}

const APP_IDENTITY = {
  name: "QBAN",
  uri: "https://qban.exchange" as `${string}://${string}`,
  icon: "favicon.ico",
};

interface MWAContextValue {
  /** Connect to a mobile wallet (Phantom, Solflare, etc.) */
  connect: () => Promise<string>;
  /** Disconnect and clear cached auth */
  disconnect: () => Promise<void>;
  /** Run a callback inside a wallet session (handles authorize) */
  withWallet: <T>(
    callback: (wallet: Web3MobileWallet, pubkey: PublicKey) => Promise<T>
  ) => Promise<T>;
}

const MWAContext = createContext<MWAContextValue | null>(null);

export function MWAProvider({ children }: { children: ReactNode }) {
  const connect = useCallback(async (): Promise<string> => {
    const address = await transact(async (wallet) => {
      const auth = await wallet.authorize({
        identity: APP_IDENTITY,
        chain: "solana:devnet",
      });
      const addr = toBase58Address(auth.accounts[0].address);
      // Cache the auth token + base58 address
      await AsyncStorage.multiSet([
        [AUTH_TOKEN_KEY, auth.auth_token],
        [WALLET_KEY, addr],
      ]);
      return addr;
    });
    return address;
  }, []);

  const disconnect = useCallback(async () => {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      try {
        await transact(async (wallet) => {
          await wallet.deauthorize({ auth_token: token });
        });
      } catch {
        // wallet may not be available, that's fine
      }
    }
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, WALLET_KEY]);
  }, []);

  const withWallet = useCallback(
    async <T,>(
      callback: (wallet: Web3MobileWallet, pubkey: PublicKey) => Promise<T>
    ): Promise<T> => {
      return await transact(async (wallet) => {
        // Try reauthorize with cached token first
        let address: string;
        const cachedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (cachedToken) {
          try {
            const reauth = await wallet.reauthorize({
              auth_token: cachedToken,
              identity: APP_IDENTITY,
            });
            address = toBase58Address(reauth.accounts[0].address);
            await AsyncStorage.setItem(AUTH_TOKEN_KEY, reauth.auth_token);
          } catch {
            // Reauth failed — do full authorize
            const auth = await wallet.authorize({
              identity: APP_IDENTITY,
              chain: "solana:devnet",
            });
            address = toBase58Address(auth.accounts[0].address);
            await AsyncStorage.multiSet([
              [AUTH_TOKEN_KEY, auth.auth_token],
              [WALLET_KEY, address],
            ]);
          }
        } else {
          const auth = await wallet.authorize({
            identity: APP_IDENTITY,
            chain: "solana:devnet",
          });
          address = toBase58Address(auth.accounts[0].address);
          await AsyncStorage.multiSet([
            [AUTH_TOKEN_KEY, auth.auth_token],
            [WALLET_KEY, address],
          ]);
        }
        return callback(wallet, new PublicKey(address));
      });
    },
    []
  );

  const value = useMemo(
    () => ({ connect, disconnect, withWallet }),
    [connect, disconnect, withWallet]
  );

  return <MWAContext.Provider value={value}>{children}</MWAContext.Provider>;
}

export function useMWA() {
  const ctx = useContext(MWAContext);
  if (!ctx) {
    throw new Error("useMWA must be used within MWAProvider");
  }
  return ctx;
}

/**
 * Get cached MWA wallet address (for restoring session on app restart).
 * Returns null if no cached wallet.
 */
export async function getCachedMWAAddress(): Promise<string | null> {
  return AsyncStorage.getItem(WALLET_KEY);
}
