import { BINANCE_API_URL } from "../constants";

interface Ticker24h {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  highPrice: string;
  lowPrice: string;
}

export interface MarketTicker {
  price: number;
  change24hPercent: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

const SYMBOL_MAP: Record<string, string> = {
  SOL: "SOLUSDT",
  ETH: "ETHUSDT",
  BTC: "BTCUSDT",
};

export async function fetchTicker24h(
  baseToken: string
): Promise<MarketTicker | null> {
  const binanceSymbol = SYMBOL_MAP[baseToken];
  if (!binanceSymbol) return null;

  const res = await fetch(
    `${BINANCE_API_URL}/api/v3/ticker/24hr?symbol=${binanceSymbol}`
  );
  if (!res.ok) return null;

  const data: Ticker24h = await res.json();
  return {
    price: parseFloat(data.lastPrice),
    change24hPercent: parseFloat(data.priceChangePercent),
    volume24h: parseFloat(data.quoteVolume),
    high24h: parseFloat(data.highPrice),
    low24h: parseFloat(data.lowPrice),
  };
}

export interface SparklinePoint {
  time: number;
  close: number;
}

export interface BinanceCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchCandles(
  baseToken: string,
  interval: string = "1m",
  limit: number = 200
): Promise<BinanceCandle[]> {
  const binanceSymbol = SYMBOL_MAP[baseToken];
  if (!binanceSymbol) return [];

  const res = await fetch(
    `${BINANCE_API_URL}/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`
  );
  if (!res.ok) return [];

  const data: unknown[][] = await res.json();
  return data.map((c) => ({
    time: c[0] as number,
    open: parseFloat(c[1] as string),
    high: parseFloat(c[2] as string),
    low: parseFloat(c[3] as string),
    close: parseFloat(c[4] as string),
    volume: parseFloat(c[5] as string),
  }));
}

export async function fetchSparkline(
  baseToken: string
): Promise<SparklinePoint[]> {
  const binanceSymbol = SYMBOL_MAP[baseToken];
  if (!binanceSymbol) return [];

  const res = await fetch(
    `${BINANCE_API_URL}/api/v3/klines?symbol=${binanceSymbol}&interval=1h&limit=24`
  );
  if (!res.ok) return [];

  const data: unknown[][] = await res.json();
  return data.map((candle) => ({
    time: candle[0] as number,
    close: parseFloat(candle[4] as string),
  }));
}
