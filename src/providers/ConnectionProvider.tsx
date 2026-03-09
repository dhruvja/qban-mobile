import { createContext, useContext, ReactNode } from "react";
import { Connection } from "@solana/web3.js";

// ─── Endpoints ──────────────────────────────────────────────────
export const MAGICBLOCK_ENDPOINT = "https://devnet.magicblock.app";
export const DEVNET_ENDPOINT = "https://api.devnet.solana.com";
export const MAGICBLOCK_WS_ENDPOINT = "wss://devnet.magicblock.app";

// ─── Singleton connections ──────────────────────────────────────
const magicblockConnection = new Connection(MAGICBLOCK_ENDPOINT);
const devnetConnection = new Connection(DEVNET_ENDPOINT);

interface ConnectionContextValue {
  /** MagicBlock connection — used for margin, positions, trading */
  magicblockConnection: Connection;
  /** Solana devnet connection — used for token balances, deposits, airdrops */
  devnetConnection: Connection;
}

const ConnectionContext = createContext<ConnectionContextValue>({
  magicblockConnection,
  devnetConnection,
});

export function ConnectionProvider({ children }: { children: ReactNode }) {
  return (
    <ConnectionContext.Provider value={{ magicblockConnection, devnetConnection }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnections() {
  return useContext(ConnectionContext);
}
