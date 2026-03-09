import { API_BASE_URL, apiPriceToUsd, baseAtomsToSol } from "../constants";
import type {
  OrderBookLevel,
  Trade,
  Position,
  UserOrder,
  OrderFill,
} from "../types";

// ─── RAW API RESPONSE TYPES ────────────────────────────────────────

interface RawOrderbookLevel {
  price: string | number;
  remaining_base_atoms?: number;
  open_base_atoms?: number;
  total_base_atoms: number;
}

interface RawFill {
  id?: string;
  signature?: string;
  price: string | number;
  base_atoms: number;
  taker_is_buy: boolean;
  block_time: string;
  taker?: string;
  maker?: string;
}

interface RawPosition {
  market: string;
  side: "long" | "short" | "flat";
  net_base_atoms: number;
  net_quote_atoms: number;
  entry_price?: string | number;
  effective_leverage: number;
  total_buys_quote?: number;
  total_sells_quote?: number;
  num_fills?: number;
}

interface RawOrder {
  id: number;
  market: string;
  order_sequence_number: number;
  is_bid: boolean;
  base_atoms: number;
  status: string;
  fills: Array<{
    base_atoms: number;
    quote_atoms?: number;
    maker_sequence_number: number;
    price?: string | number;
  }>;
  filled_base_atoms?: number;
  filled_quote_atoms?: number;
  block_time?: string;
}

// ─── API CLIENT ─────────────────────────────────────────────────────

async function fetchApi<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// ─── MARKET ENDPOINTS ───────────────────────────────────────────────

export async function fetchOrderbook(
  market: string
): Promise<{ bids: OrderBookLevel[]; asks: OrderBookLevel[] }> {
  const data = await fetchApi<{
    bids: RawOrderbookLevel[];
    asks: RawOrderbookLevel[];
  }>(`/markets/${market}/orderbook`);

  const parseLevel = (level: RawOrderbookLevel): OrderBookLevel => ({
    price: apiPriceToUsd(level.price),
    size: baseAtomsToSol(level.total_base_atoms),
    total: baseAtomsToSol(level.total_base_atoms),
  });

  return {
    bids: data.bids.map(parseLevel),
    asks: data.asks.map(parseLevel),
  };
}

export async function fetchMarketTrades(
  market: string,
  limit = 50
): Promise<Trade[]> {
  const data = await fetchApi<{ fills: RawFill[] }>(
    `/markets/${market}/fills?limit=${limit}`
  );

  return data.fills.map((fill, index) => ({
    id: fill.id ?? fill.signature ?? String(index),
    price: apiPriceToUsd(fill.price),
    size: baseAtomsToSol(fill.base_atoms),
    side: fill.taker_is_buy ? ("buy" as const) : ("sell" as const),
    timestamp: new Date(fill.block_time).getTime(),
  }));
}

// ─── TRADER ENDPOINTS ───────────────────────────────────────────────

export async function fetchTraderPositions(
  trader: string
): Promise<RawPosition[]> {
  const data = await fetchApi<{ positions: RawPosition[] }>(
    `/traders/${trader}/positions`
  );
  return data.positions;
}

export async function fetchTraderOrders(
  trader: string,
  limit = 50
): Promise<UserOrder[]> {
  const data = await fetchApi<{ orders: RawOrder[] }>(
    `/traders/${trader}/orders/fills?limit=${limit}`
  );

  return data.orders.map((order) => ({
    id: order.id,
    market: order.market,
    order_sequence_number: order.order_sequence_number,
    is_bid: order.is_bid,
    base_atoms: order.base_atoms,
    status: order.status,
    fills: order.fills.map(
      (fill): OrderFill => ({
        base_atoms: fill.base_atoms,
        quote_atoms: fill.quote_atoms ?? 0,
        maker_sequence_number: fill.maker_sequence_number,
        price: fill.price ? apiPriceToUsd(fill.price) : 0,
      })
    ),
    filled_base_atoms: order.filled_base_atoms ?? 0,
    filled_quote_atoms: order.filled_quote_atoms ?? 0,
    block_time: order.block_time,
  }));
}

/** Fetch a trader's individual fills (flattened from orders) */
export async function fetchTraderFills(
  trader: string,
  limit = 50
): Promise<
  Array<{
    orderId: number;
    isBid: boolean;
    baseAtoms: number;
    quoteAtoms: number;
    price: number;
    blockTime: string | undefined;
  }>
> {
  const data = await fetchApi<{ orders: RawOrder[] }>(
    `/traders/${trader}/orders/fills?limit=${limit}`
  );
  const fills: Array<{
    orderId: number;
    isBid: boolean;
    baseAtoms: number;
    quoteAtoms: number;
    price: number;
    blockTime: string | undefined;
  }> = [];

  for (const order of data.orders) {
    for (const fill of order.fills) {
      fills.push({
        orderId: order.id,
        isBid: order.is_bid,
        baseAtoms: fill.base_atoms,
        quoteAtoms: fill.quote_atoms ?? 0,
        price: fill.price ? apiPriceToUsd(fill.price) : 0,
        blockTime: order.block_time,
      });
    }
  }

  return fills;
}

// ─── LEADERBOARD ────────────────────────────────────────────────────

export async function fetchAllTraderFills(
  market: string
): Promise<RawFill[]> {
  const data = await fetchApi<{ fills: RawFill[] }>(
    `/markets/${market}/fills?limit=500`
  );
  return data.fills;
}
