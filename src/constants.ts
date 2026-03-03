import type { MarketConfig } from "./types";

// ─── API ────────────────────────────────────────────────────────────

export const API_BASE_URL = "https://tapguru.fun/api/v1";
export const WS_URL = "wss://tapguru.fun/ws";

// ─── SOLANA ─────────────────────────────────────────────────────────

export const MAGICBLOCK_ENDPOINT = "https://devnet.magicblock.app";
export const DEVNET_ENDPOINT = "https://api.devnet.solana.com";
export const MAGICBLOCK_WS_ENDPOINT = "wss://devnet.magicblock.app";

export const USDC_MINT = "5PcHLtca749zFDf9WA9RBo8QbbrtQBuHx9TSGKMiThCe";
export const USDC_DECIMALS = 6;
export const SOL_DECIMALS = 9;

export const MANIFEST_PROGRAM_ID = "3TN9efyWfeG3s1ZDZdbYtLJwMdWRRtM2xPGsM2T9QrUa";

// ─── PYTH ───────────────────────────────────────────────────────────

export const PYTH_SOL_USD_FEED = "ENYwebBThHzmzwPLAQvCucUTsjyfBSZdD9ViXksS4jPu";

// ─── PRICE CONVERSIONS ──────────────────────────────────────────────

/** Convert API price (quote_atoms_per_base_atom * 1e18) to USD */
export function apiPriceToUsd(price: string | number): number {
  return Number(price) / 1e15;
}

/** Convert base atoms to SOL */
export function baseAtomsToSol(atoms: number): number {
  return atoms / 10 ** SOL_DECIMALS;
}

/** Convert quote atoms to USDC */
export function quoteAtomsToUsdc(atoms: number): number {
  return atoms / 10 ** USDC_DECIMALS;
}

// ─── MARKETS ────────────────────────────────────────────────────────

export const MARKETS: MarketConfig[] = [
  {
    symbol: "SOL/USD",
    displayName: "Solana",
    baseToken: "SOL",
    quoteToken: "USD",
    status: "live",
    pythFeedAddress: PYTH_SOL_USD_FEED,
  },
  {
    symbol: "ETH/USD",
    displayName: "Ethereum",
    baseToken: "ETH",
    quoteToken: "USD",
    status: "coming_soon",
  },
  {
    symbol: "BTC/USD",
    displayName: "Bitcoin",
    baseToken: "BTC",
    quoteToken: "USD",
    status: "coming_soon",
  },
];

// ─── TRADING DEFAULTS ───────────────────────────────────────────────

export const DEFAULT_LEVERAGE = 5;
export const MAX_LEVERAGE_NEW_USER = 25;
export const MAX_LEVERAGE_EXPERIENCED = 100;
export const LEVERAGE_PRESETS = [1, 5, 10, 25] as const;
export const BALANCE_PRESETS = [0.25, 0.5, 0.75, 1] as const;
export const CLOSE_PRESETS = [0.25, 0.5, 0.75, 1] as const;
export const EXPERIENCED_TRADE_THRESHOLD = 5;

// ─── BINANCE ────────────────────────────────────────────────────────

export const BINANCE_API_URL = "https://data-api.binance.vision";
