// ─── ORDER BOOK & TRADING ───────────────────────────────────────────

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export interface Trade {
  id: string;
  price: number;
  size: number;
  side: "buy" | "sell";
  timestamp: number;
}

// ─── ORDERS ────────────────────────────────────────────────────────

export type OrderType = "market" | "limit";
export type OrderSide = "long" | "short";
export type OrderStatus = "pending" | "filled" | "partially_filled" | "cancelled" | "rejected";

export interface Order {
  id: string;
  symbol: string;
  type: OrderType;
  side: OrderSide;
  size: number;
  price?: number;
  leverage: number;
  status: OrderStatus;
  timestamp: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface UserOrder {
  id: number;
  market: string;
  order_sequence_number: number;
  is_bid: boolean;
  base_atoms: number;
  status: string;
  fills: OrderFill[];
  filled_base_atoms: number;
  filled_quote_atoms: number;
  block_time?: string;
}

export interface OrderFill {
  base_atoms: number;
  quote_atoms: number;
  maker_sequence_number: number;
  price: number;
}

// ─── POSITIONS ────────────────────────────────────────────────────

export type PositionDirection = "long" | "short" | "flat";

export interface Position {
  id: string;
  symbol: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  currentPrice: number;
  leverage: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  liquidationPrice: number;
  funding: number;
  stopLoss?: number;
  takeProfit?: number;
  marginUsed: number;
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  exitPrice: number;
  leverage: number;
  realizedPnl: number;
  realizedPnlPercent: number;
  openTime: number;
  closeTime: number;
}

// ─── MARKET DATA ────────────────────────────────────────────────────

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  fundingRate: number;
  nextFundingTime: number;
  high24h: number;
  low24h: number;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

// ─── MARKET CONFIG ──────────────────────────────────────────────────

export type MarketStatus = "live" | "coming_soon";

export interface MarketConfig {
  symbol: string;
  displayName: string;
  baseToken: string;
  quoteToken: string;
  status: MarketStatus;
  marketAddress?: string;
  pythFeedAddress?: string;
}

// ─── ACCOUNT & MARGIN ────────────────────────────────────────────────

export interface AccountEquity {
  walletBalance: number;
  usedMargin: number;
  availableMargin: number;
  totalEquity: number;
}

// ─── LEADERBOARD ─────────────────────────────────────────────────────

export type LeaderboardPeriod = "all" | "week" | "month";

export interface LeaderboardTrader {
  rank: number;
  trader: string;
  trades: number;
  volume: number;
  pnl: number;
  effectiveLeverage: number;
  entryPrice: number;
  side: PositionDirection;
  positionSize: number;
}

// ─── USER PROFILE ────────────────────────────────────────────────────

export interface UserProfile {
  wallet_address: string;
  username: string;
  display_name?: string;
  bio?: string;
  pfp_url?: string;
  is_private: boolean;
  followers_count: number;
  following_count: number;
  created_at: string;
}

export interface Follow {
  follower: string;
  following: string;
  created_at: string;
}

// ─── FEED ────────────────────────────────────────────────────────────

export type FeedItemType = "open_position" | "close_position";

export interface FeedItem {
  id: string;
  type: FeedItemType;
  trader: string;
  profile?: UserProfile;
  symbol: string;
  side: "long" | "short";
  size: number;
  leverage: number;
  price: number;
  pnl?: number;
  pnlPercent?: number;
  timestamp: number;
  reactions: {
    eyes: number;
    fire: number;
  };
}

// ─── REFERRAL ────────────────────────────────────────────────────────

export type ReferralStatus = "signed_up" | "first_trade" | "active";

export interface Referral {
  referrer: string;
  referee: string;
  code: string;
  status: ReferralStatus;
  rewards_earned: number;
  created_at: string;
}
