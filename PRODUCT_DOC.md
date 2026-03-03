# QBAN Mobile - Product Document

## Vision

Build a dead-simple mobile trading app for perpetual futures on Solana. Targeted at users who have **never used crypto** — no jargon, no complexity, just "bet on price going up or down."

Think Robinhood for perps, not Binance.

---

## Target User

- Age 18-35, smartphone-native
- May have used Robinhood/Cash App but never a DEX
- Does NOT know what "orderbook", "leverage", "funding rate", or "liquidation" mean
- Wants to make money from price movements with minimal friction
- Expects instant onboarding (no seed phrases, no browser extensions)

---

## Core Principles

1. **No crypto jargon** — "Deposit" not "Claim Seat", "Profit/Loss" not "Unrealized PnL", "Multiplier" not "Leverage"
2. **One-tap actions** — Every core action should be achievable in 1-2 taps
3. **Progressive disclosure** — Show advanced features only when the user is ready
4. **Safety rails** — Prevent users from blowing up with sensible defaults and warnings
5. **Mobile-first interactions** — Swipe, pull-to-refresh, haptic feedback, bottom sheets

---

## Screens & Navigation

### Navigation Structure

Bottom tab bar with 4 tabs:

```
┌──────────────────────────────────┐
│                                  │
│         [Active Screen]          │
│                                  │
├──────┬───────┬──────┬────────────┤
│ Home │ Trade │ Portfolio │ More  │
└──────┴───────┴──────┴────────────┘
```

---

### Screen 1: Onboarding (First Launch Only)

**Purpose**: Get users from install to trading in under 60 seconds.

**Flow**:
1. **Welcome** — "Trade SOL. Earn more." with a single CTA
2. **Sign Up** — Email / Apple ID / Google (via Privy) — NO seed phrases, NO wallet setup
3. **Quick Tutorial** (skippable) — 3 swipeable cards:
   - "Pick a direction — Up or Down"
   - "Set your amount and multiplier"
   - "Watch your profit grow in real-time"
4. **Deposit** — Apple Pay / Card / USDC transfer. Show balance after.
5. **Land on Home screen**

**What NOT to show**: Wallet addresses, network selection, gas fees, private keys.

---

### Screen 2: Home

**Purpose**: Show balance and browse available markets.

**Layout**:
```
┌──────────────────────────────────┐
│  QBAN                    [Avatar]│
│                                  │
│  Your Balance                    │
│  $512.50                         │
│  [Deposit]    [Withdraw]         │
│                                  │
│  ── Markets ──                   │
│                                  │
│  ┌────────────────────────────┐  │
│  │ ◉ SOL/USD                  │  │
│  │ $142.35         +2.4% 24h  │  │
│  │ Vol $1.2M    Funding 0.01% │  │
│  │ ─ mini sparkline chart ──  │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ ◉ ETH/USD        (coming) │  │
│  │ $3,850.20        +1.1% 24h│  │
│  │ ─ mini sparkline chart ──  │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ ◉ BTC/USD        (coming) │  │
│  │ $98,420.00       -0.3% 24h│  │
│  │ ─ mini sparkline chart ──  │  │
│  └────────────────────────────┘  │
│                                  │
│  (more markets added over time)  │
│                                  │
└──────────────────────────────────┘
```

Each market card is tappable → navigates to the **Trade screen** for that market.

Future markets show a "coming soon" badge and are not tappable until live.

**Key decisions**:
- Balance is the hero element at top — users always know their buying power
- Deposit/Withdraw buttons are immediately accessible from home
- Markets are a scrollable list of cards — scales naturally as we add more
- Each card shows: price, 24h change, volume, mini sparkline
- Tapping a market card goes to the Trade screen (no separate Up/Down on home)
- "Coming soon" markets build anticipation without cluttering the UI
- Pull-to-refresh updates all prices

---

### Screen 3: Trade

**Purpose**: Place a trade. This is the core screen.

**Entry points**:
- Tap a market card from Home → opens Trade screen for that market
- Tap "Trade" tab → opens last viewed market (defaults to SOL/USD)

**Layout**:
```
┌──────────────────────────────────┐
│  ← SOL / USD           $142.35  │
│                                  │
│  ┌────────────────────────────┐  │
│  │    Price Chart (expanded)   │  │
│  │    Interactive, zoomable    │  │
│  │    Shows entry price line   │  │
│  └────────────────────────────┘  │
│                                  │
│  Direction                       │
│  ┌──────────┐ ┌──────────────┐   │
│  │  🟢 UP   │ │  🔴 DOWN     │   │
│  └──────────┘ └──────────────┘   │
│                                  │
│  Amount (USD)                    │
│  ┌────────────────────────────┐  │
│  │  $50.00                    │  │
│  └────────────────────────────┘  │
│  [25%] [50%] [75%] [Max]        │
│  Balance: $500.00                │
│                                  │
│  Multiplier                      │
│  ──●─────────────────── 5x       │
│  [1x]  [5x]  [10x]  [25x]       │
│                                  │
│  ── Summary ──                   │
│  Position Size    $250.00        │
│  Liquidation      $114.00        │
│  Est. Fee         $0.25          │
│                                  │
│  ┌────────────────────────────┐  │
│  │    OPEN POSITION (UP) 🟢   │  │
│  └────────────────────────────┘  │
│                                  │
│  ▿ Advanced (collapsed)          │
│    Order Type: Market / Limit    │
│    Take Profit: $___             │
│    Stop Loss: $___               │
└──────────────────────────────────┘
```

**Key decisions**:
- Default to **Market order** — limit orders hidden under "Advanced"
- Default multiplier to **5x** (not 1x, not 100x) — balanced risk
- Show **liquidation price** prominently as a safety rail
- "Multiplier" instead of "Leverage" — friendlier language
- Amount shown as USD not SOL — users think in dollars
- Max multiplier capped at **25x for new users** (unlock 50x/100x after first 5 trades)
- Confirmation bottom sheet before execution with clear summary

**Confirmation Bottom Sheet** (slides up after tapping "Open Position"):
```
┌──────────────────────────────────┐
│  Confirm Trade                   │
│                                  │
│  Direction     UP (Long)         │
│  Amount        $50.00            │
│  Multiplier    5x                │
│  Position Size $250.00           │
│  Entry Price   ~$142.35          │
│  Liquidation   ~$114.00          │
│  Fee           ~$0.25            │
│                                  │
│  ┌────────────────────────────┐  │
│  │      CONFIRM TRADE         │  │
│  └────────────────────────────┘  │
│         Cancel                   │
└──────────────────────────────────┘
```

---

### Screen 4: Portfolio

**Purpose**: See your positions, P&L, and trade history.

**Layout**:
```
┌──────────────────────────────────┐
│  Portfolio                       │
│                                  │
│  Total Balance     $512.50       │
│  Available         $462.50       │
│  In Positions      $50.00        │
│                                  │
│  ── Active Position ──           │
│  ┌────────────────────────────┐  │
│  │ SOL/USD          UP 🟢     │  │
│  │ +$12.50 (+25.0%)           │  │
│  │                             │  │
│  │ Size     $250  (5x)        │  │
│  │ Entry    $142.35            │  │
│  │ Current  $145.20            │  │
│  │ Liq.     $114.00            │  │
│  │                             │  │
│  │ [Close 25%][Close 50%]      │  │
│  │ [Close 75%][Close All]      │  │
│  └────────────────────────────┘  │
│                                  │
│  ── History ──                   │
│  Today                           │
│  ✅ SOL UP  +$8.20   2:30 PM    │
│  ❌ SOL DOWN -$3.10   11:15 AM  │
│                                  │
│  Yesterday                       │
│  ✅ SOL UP  +$15.00  4:45 PM    │
│  ...                             │
└──────────────────────────────────┘
```

**Key decisions**:
- One position card at a time (we only support SOL/USD for now)
- Close buttons are percentage-based — no need to calculate SOL amounts
- P&L shown in dollars AND percentage — both are intuitive
- Trade history uses simple win/loss indicators
- Color coding: green for profit, red for loss — universal understanding
- Pull-to-refresh for latest data
- Tapping a position card expands to show more details (funding, time open)

**Close Position Bottom Sheet**:
```
┌──────────────────────────────────┐
│  Close Position                  │
│                                  │
│  Closing 50% of your position   │
│                                  │
│  You receive    ~$31.25          │
│  Profit/Loss    +$6.25           │
│  Remaining      $125.00 (5x)    │
│                                  │
│  ○ Market (instant)              │
│  ○ Set price ($_____)            │
│                                  │
│  ┌────────────────────────────┐  │
│  │      CLOSE POSITION        │  │
│  └────────────────────────────┘  │
│         Cancel                   │
└──────────────────────────────────┘
```

---

### Screen 5: Leaderboard (FOMO-inspired)

**Purpose**: Social discovery, gamification, and competition. Inspired by [FOMO](https://fomo.family/) — the best social trading app in crypto.

**Layout**:
```
┌──────────────────────────────────┐
│  Leaderboard                     │
│                                  │
│  [Top Traders] [Friends] [Feed]  │
│                                  │
│  ── Top Traders Tab ──           │
│  [All Time] [Week] [Month]       │
│                                  │
│  ┌────────────────────────────┐  │
│  │ 🥇  [pfp]  @cigarking      │  │
│  │     +$5,200  •  42 trades  │  │
│  │     "SOL to $200 ez"       │  │
│  │     [Follow]               │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ 🥈  [pfp]  @solwhale       │  │
│  │     +$3,100  •  38 trades  │  │
│  │     "buying every dip"     │  │
│  │     [Follow]               │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ 🥉  [pfp]  @degen_dan      │  │
│  │     +$2,800  •  29 trades  │  │
│  │     [Follow]               │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │  4  [pfp]  @tradoor        │  │
│  │     +$1,900  •  22 trades  │  │
│  └────────────────────────────┘  │
│  ...                             │
│                                  │
│  ── Sticky Footer ──             │
│  ┌────────────────────────────┐  │
│  │ #12  [your pfp] You        │  │
│  │      +$450  •  15 trades   │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

**Trader Profile Card** (tap a trader to expand):
```
┌──────────────────────────────────┐
│  ←                     [Follow]  │
│                                  │
│        [large pfp]               │
│        @cigarking                │
│    "SOL to $200 ez"              │
│                                  │
│  ┌────────┬─────────┬─────────┐  │
│  │ P&L    │ Trades  │ Win %   │  │
│  │+$5,200 │ 42      │ 71%     │  │
│  └────────┴─────────┴─────────┘  │
│                                  │
│  ── Recent Activity ──           │
│  Opened UP on SOL     2m ago     │
│  Closed UP  +$320     1h ago     │
│  Opened DOWN on SOL   3h ago     │
│                                  │
│  ── Open Positions ──            │
│  SOL/USD  UP  5x  +$82 (+4.1%)  │
│                                  │
└──────────────────────────────────┘
```

**Feed Tab** (social activity stream, like FOMO's):
```
┌──────────────────────────────────┐
│  [Top Traders] [Friends] [Feed]  │
│                                  │
│  [pfp] @cigarking         2m ago │
│  Opened UP on SOL at $142.35    │
│  5x  •  $500 position           │
│  [Follow]                [👀 12] │
│  ─────────────────────────────── │
│  [pfp] @solwhale          8m ago │
│  Closed DOWN on SOL  +$320      │
│  "told y'all 🤙"                │
│  [Follow]                [🔥 24] │
│  ─────────────────────────────── │
│  [pfp] @degen_dan        15m ago │
│  Opened DOWN on SOL at $143.10  │
│  10x  •  $1,000 position        │
│  [Follow]                [👀 8]  │
│  ...                             │
└──────────────────────────────────┘
```

**Key decisions**:
- **3 sub-tabs**: Top Traders (rankings), Friends (people you follow), Feed (live activity stream)
- **Trader cards show**: pfp, username, P&L, trade count, optional bio/quote
- **Follow system**: follow any trader to see their activity in your Friends tab
- **Feed is public by default** — every trade is visible (like FOMO), creates transparency and social proof
- **Trader profile page**: tap a card to see full stats, recent activity, and open positions
- **Reactions on feed items**: emoji reactions (eyes, fire) to create engagement without comments
- **Sticky "Your Rank"** at bottom — always visible, motivates climbing
- **No copy trading in V1** — just visibility. Copy trading is a V2 feature.
- **Activity is opt-in**: users can toggle "trade privately" in settings to hide from feed

---

### User Profiles & Identity

**Purpose**: Give every trader a social identity without crypto complexity.

**Profile Setup** (prompted after first trade, not during onboarding):
```
┌──────────────────────────────────┐
│  Set Up Your Profile             │
│                                  │
│  Nice trade! Let others see      │
│  your moves on the leaderboard.  │
│                                  │
│        [pfp placeholder]         │
│        [Choose Photo]            │
│                                  │
│  Username                        │
│  ┌────────────────────────────┐  │
│  │  @________________         │  │
│  └────────────────────────────┘  │
│  3-15 chars, letters & numbers   │
│                                  │
│  Bio (optional)                  │
│  ┌────────────────────────────┐  │
│  │  "                      "  │  │
│  └────────────────────────────┘  │
│  Max 60 chars                    │
│                                  │
│  ┌────────────────────────────┐  │
│  │       SAVE PROFILE         │  │
│  └────────────────────────────┘  │
│         Skip for now             │
└──────────────────────────────────┘
```

**Profile picture options**:
1. **Camera / photo library** — standard mobile photo picker
2. **Auto-generated avatar** — unique avatar generated from wallet address (like FOMO/ENS identicons) as fallback
3. **NFT PFP** (future) — use an NFT from their wallet as pfp

**Username rules**:
- Unique, 3-15 characters, alphanumeric + underscores
- Stored in backend (not on-chain) — cheap and fast
- Displayed as `@username` everywhere
- Fallback for users who skip: show truncated wallet address (`0xAb..cD`)

**Where profiles appear**:
- Leaderboard cards
- Feed activity items
- Trader profile pages
- Your own Portfolio screen header

**Data model**:
```
UserProfile {
  wallet_address: string    // primary key
  username: string          // unique, indexed
  display_name?: string     // optional, shown instead of @username
  bio?: string              // max 60 chars
  pfp_url?: string          // uploaded image URL or generated avatar
  is_private: boolean       // hide trades from feed (default: false)
  followers_count: number
  following_count: number
  created_at: timestamp
}

Follow {
  follower: wallet_address
  following: wallet_address
  created_at: timestamp
}
```

---

### Screen 6: More (Settings & Account)

**Purpose**: Account management, deposits/withdrawals, settings.

**Layout**:
```
┌──────────────────────────────────┐
│  Account                         │
│                                  │
│  john@email.com                  │
│  0xAb..cD (tap to copy)         │
│                                  │
│  ── Funds ──                     │
│  [Deposit]         [Withdraw]    │
│                                  │
│  Balance: $512.50                │
│  Deposit Methods:                │
│   • Apple Pay                    │
│   • Card                         │
│   • Transfer USDC                │
│                                  │
│  ── Profile ──                   │
│  [pfp] @username       [Edit ▸]  │
│  Bio: "SOL maxi"       [Edit ▸]  │
│                                  │
│  ── Settings ──                  │
│  Trade Privately        [toggle] │
│  Notifications          [toggle] │
│  Default Multiplier     [5x ▸]   │
│  Price Alerts           [▸]      │
│  Dark / Light Theme     [toggle] │
│                                  │
│  ── Support ──                   │
│  How it works           [▸]      │
│  FAQs                   [▸]      │
│  Contact Support        [▸]      │
│                                  │
│  ── Legal ──                     │
│  Terms of Service       [▸]      │
│  Privacy Policy         [▸]      │
│                                  │
│  [Sign Out]                      │
└──────────────────────────────────┘
```

---

## Deposit & Withdrawal Flow

### Deposit
```
More → Deposit → Choose Method
  ├── Apple Pay → Amount → Confirm → Done
  ├── Card → Stripe/MoonPay → Amount → Confirm → Done
  └── USDC Transfer → Show QR + address → Waiting → Confirmed
```

### Withdraw
```
More → Withdraw → Enter Amount → Choose Destination
  ├── Bank (via off-ramp) → Confirm → Processing
  └── USDC to wallet → Paste address → Confirm → Sent
```

---

## Notifications & Alerts (V1.1 — push infra not ready for V1)

V1 uses **in-app toasts only** (react-native toast). Push notifications added in V1.1.

**In-app toasts (V1)**:
- Position opened confirmation
- Position closed confirmation
- Deposit/withdrawal confirmed
- Referral signup notification

**Push notifications (V1.1)**:
- Position opened/closed confirmation
- Approaching liquidation (at 80% and 95% of liquidation price)
- Take profit / stop loss triggered
- Large P&L milestones (+$100, +$500, etc.)
- Funding payment applied
- Someone you follow opened a position
- Someone followed you
- You moved up on the leaderboard
- Referral signed up and made first trade

**Optional alerts (V1.1)**:
- Price alerts (SOL hits $X)
- Daily P&L summary

---

## Referral System (V1 MVP)

**Purpose**: Organic growth via trader-to-trader referrals.

**How it works**:
- Every user gets a unique referral code after signup (e.g., `QBAN-CIGAR42`)
- Share via native share sheet (link: `qban.exchange/ref/CIGAR42`)
- Referee signs up → linked to referrer permanently

**Referral flow**:
```
Share Code → Friend Downloads App → Signs Up via Link
  → Referrer gets credit → Rewards unlock on referee's first trade
```

**Where it lives in the app**:
```
┌──────────────────────────────────┐
│  More → Refer & Earn             │
│                                  │
│  Invite friends. Earn together.  │
│                                  │
│  Your Code                       │
│  ┌────────────────────────────┐  │
│  │  QBAN-CIGAR42    [Copy]   │  │
│  └────────────────────────────┘  │
│                                  │
│  [Share Link]                    │
│                                  │
│  ── Your Referrals ──           │
│  @solwhale     Joined 2d ago     │
│  @tradoor      Joined 1w ago     │
│                                  │
│  Total Referred: 2               │
│  Rewards Earned: $XX.XX          │
└──────────────────────────────────┘
```

**Reward structure** (TBD — see open questions):
- Option A: Referrer gets X% of referee's trading fees, forever
- Option B: Both get a fixed USDC bonus on referee's first trade
- Option C: Tiered — small bonus upfront + ongoing fee share

**Data model**:
```
Referral {
  referrer: wallet_address
  referee: wallet_address
  code: string              // unique referral code
  status: "signed_up" | "first_trade" | "active"
  rewards_earned: number
  created_at: timestamp
}
```

---

## Language Mapping (Crypto → Simple)

| Crypto Term | Mobile App Term |
|---|---|
| Long | Up / Betting Up |
| Short | Down / Betting Down |
| Leverage | Multiplier |
| Margin | Amount / Your money in |
| Unrealized PnL | Profit / Loss |
| Liquidation | Auto-close price |
| Funding rate | Holding fee |
| Orderbook | (hidden — not shown) |
| Claim seat | (hidden — automatic) |
| Gas fee | (hidden — gasless via sessions) |
| Wallet address | Account ID |
| Market order | Instant trade |
| Limit order | Set price trade |
| Notional value | Position size |
| Take profit | Auto-sell at profit |
| Stop loss | Auto-sell at loss |

---

## What We Hide (vs. Web App)

The web app is a full trading terminal. The mobile app hides:

| Web Feature | Mobile Treatment |
|---|---|
| Orderbook | Hidden entirely — unnecessary for target users |
| Recent trades feed | Hidden — replaced by simplified history |
| Resizable panels | Fixed mobile layout |
| Wallet adapter picker | Replaced by Privy (email/social login) |
| Manual seat claiming | Automatic behind the scenes |
| Session key management | Automatic 1-click trade, no UI for it |
| Funding rate formula | Shown as "Holding fee: $X/hr" |
| Candlestick chart controls | Simplified — pinch to zoom, swipe to scroll |
| 50x / 100x leverage | Locked for new users (progressive unlock) |
| Limit order by default | Market order default, limit under "Advanced" |

---

## Safety Rails for New Users

1. **Max multiplier cap**: New accounts start with max 25x. Unlock higher after 5+ completed trades.
2. **Liquidation warning**: When setting multiplier, show "You'll be auto-closed if price drops X%" in plain English.
3. **Confirmation on every trade**: Bottom sheet with full summary before execution.
4. **Approaching liquidation alerts**: Push notification at 80% and 95% toward liquidation.
5. **Position size warning**: If using >50% of balance, show "Are you sure? This uses most of your balance."
6. **Cool-off prompt**: After 3 losses in a row, show "Take a break? Markets will be here later."

---

## Tech Stack (Mobile)

| Layer | Technology |
|---|---|
| Framework | Expo (React Native) |
| Language | TypeScript |
| Navigation | Expo Router (file-based) |
| State | Zustand or TanStack Query (reuse web hooks) |
| Auth | Privy React Native SDK |
| Charts | TradingView `lightweight-charts` via `react-native-webview` (reuse web chart code) |
| Blockchain | `@solana/web3.js` (via polyfills) |
| Notifications | Expo Notifications + push server |
| Payments | Apple Pay / Stripe via Expo |
| Animations | `react-native-reanimated` |
| Styling | NativeWind (Tailwind for RN) |
| Haptics | `expo-haptics` |

---

## Shared Code with Web

The following can be directly reused from `perp-ui`:

1. **API layer** — REST endpoints (`/api/v1/...`) and WebSocket subscriptions
2. **Trading logic** — Order construction, margin calculations, P&L formulas
3. **Blockchain interactions** — Anchor IDL, instruction builders, PDA derivation
4. **Price feed** — Pyth WebSocket subscription hook
5. **Session management** — Ephemeral keypair logic (with IndexedDB → SecureStore swap)
6. **Types/interfaces** — Order types, position types, market data types

---

## MVP Tracker

Update the **Status** column after completing each step. Use: `Not Started` → `In Progress` → `Done`

### Phase 1: Project Setup & Foundation

| # | Task | Description | Status |
|---|---|---|---|
| 1.1 | Expo project init | `npx create-expo-app` with TypeScript template | Not Started |
| 1.2 | Expo Router setup | File-based routing with bottom tab layout | Not Started |
| 1.3 | NativeWind config | Tailwind CSS setup with QBAN brand colors/fonts | Not Started |
| 1.4 | Dark theme | Global dark theme using brand kit (qban-black, charcoal, yellow) | Not Started |
| 1.5 | Custom fonts | Load Bebas Neue, Space Mono, DM Sans via expo-font | Not Started |
| 1.6 | Shared types | Copy/adapt TypeScript types from perp-ui (orders, positions, market data) | Not Started |
| 1.7 | API client | REST client for `tapguru.fun/api/v1/` endpoints | Not Started |
| 1.8 | WebSocket client | WS connection for orderbook + fills + price updates | Not Started |

### Phase 2: Auth & Wallet

| # | Task | Description | Status |
|---|---|---|---|
| 2.1 | Privy SDK setup | Install & configure `@privy-io/expo` | Not Started |
| 2.2 | Login screen | Email / Apple / Google sign-in UI | Not Started |
| 2.3 | Embedded wallet | Auto-create Solana wallet on signup (no seed phrase) | Not Started |
| 2.4 | Session keys | Port 1-click trading (ephemeral keypairs) — swap IndexedDB for SecureStore | Not Started |
| 2.5 | Auth state | Auth context — logged in/out state, auto-reconnect | Not Started |

### Phase 3: Onboarding

| # | Task | Description | Status |
|---|---|---|---|
| 3.1 | Welcome screen | "Trade SOL. Earn more." with CTA | Not Started |
| 3.2 | Tutorial cards | 3 swipeable cards explaining Up/Down, Amount, Profit | Not Started |
| 3.3 | Skip + remember | Tutorial only on first launch, skip button, AsyncStorage flag | Not Started |

### Phase 4: Home Screen

| # | Task | Description | Status |
|---|---|---|---|
| 4.1 | Balance display | Fetch + show USDC margin balance at top | Not Started |
| 4.2 | Deposit/Withdraw buttons | Buttons linking to deposit/withdraw flows | Not Started |
| 4.3 | Market list | Scrollable list of market cards | Not Started |
| 4.4 | Market card — live | SOL/USD card with price, 24h change, volume | Not Started |
| 4.5 | Market card — coming soon | ETH/USD, BTC/USD with "coming soon" badge, non-tappable | Not Started |
| 4.6 | Mini sparkline | Small 24h price chart on each live market card | Not Started |
| 4.7 | Pull-to-refresh | Refresh all prices on pull down | Not Started |
| 4.8 | Pyth price feed | Port `usePythPrice` hook — live SOL/USD from Pyth oracle | Not Started |

### Phase 5: Trade Screen

| # | Task | Description | Status |
|---|---|---|---|
| 5.1 | Screen layout | Header with market name + price, scrollable body | Not Started |
| 5.2 | Chart — WebView | TradingView lightweight-charts in react-native-webview | Not Started |
| 5.3 | Chart — candle data | Fetch Binance 1m candles, pipe to WebView via postMessage | Not Started |
| 5.4 | Chart — live updates | Stream Pyth price into chart in real-time | Not Started |
| 5.5 | Direction picker | Up (Long) / Down (Short) toggle buttons | Not Started |
| 5.6 | Amount input | USD amount field with 25/50/75/Max presets | Not Started |
| 5.7 | Multiplier slider | 1-25x slider with preset buttons (1x, 5x, 10x, 25x) | Not Started |
| 5.8 | Order summary | Position size, liquidation price, est. fee — live calculation | Not Started |
| 5.9 | Confirmation sheet | Bottom sheet with full trade summary before execution | Not Started |
| 5.10 | Submit market order | Build + send Anchor instruction via session key | Not Started |
| 5.11 | Success/error toast | In-app toast on trade result | Not Started |
| 5.12 | Safety — liq warning | Show "auto-closed if price drops X%" when setting multiplier | Not Started |
| 5.13 | Safety — balance warning | Warning if using >50% of balance | Not Started |

### Phase 6: Portfolio Screen

| # | Task | Description | Status |
|---|---|---|---|
| 6.1 | Balance overview | Total balance, available, in positions | Not Started |
| 6.2 | Active position card | Show direction, size, entry, current, P&L, liquidation | Not Started |
| 6.3 | Live P&L updates | Real-time P&L from Pyth price stream | Not Started |
| 6.4 | Close position — UI | Close 25/50/75/100% buttons | Not Started |
| 6.5 | Close position — sheet | Bottom sheet with close summary + confirm | Not Started |
| 6.6 | Close position — tx | Build + send close instruction | Not Started |
| 6.7 | Trade history | List of past trades with win/loss, P&L, timestamp | Not Started |
| 6.8 | Pull-to-refresh | Refresh position + history on pull down | Not Started |

### Phase 7: Deposit & Withdraw

| # | Task | Description | Status |
|---|---|---|---|
| 7.1 | Deposit screen | Show wallet address + QR code for USDC transfer | Not Started |
| 7.2 | Copy address | Tap to copy wallet address with haptic feedback | Not Started |
| 7.3 | Deposit detection | Poll/listen for incoming USDC, update balance | Not Started |
| 7.4 | Withdraw screen | Amount input + paste destination address | Not Started |
| 7.5 | Withdraw confirmation | Summary bottom sheet + confirm | Not Started |
| 7.6 | Withdraw tx | Build + send withdraw instruction | Not Started |

### Phase 8: Leaderboard

| # | Task | Description | Status |
|---|---|---|---|
| 8.1 | Top Traders tab | Ranked list of traders by P&L | Not Started |
| 8.2 | Trader cards | PFP, @username, P&L, trade count, bio | Not Started |
| 8.3 | Time filter | All Time / Week / Month toggle | Not Started |
| 8.4 | Your rank footer | Sticky bottom bar showing your rank | Not Started |
| 8.5 | Trader profile page | Tap card → full profile with stats + recent activity | Not Started |
| 8.6 | Friends tab | List of traders you follow + their rankings | Not Started |
| 8.7 | Feed tab | Live activity stream of all public trades | Not Started |
| 8.8 | Feed reactions | Emoji reactions on feed items (eyes, fire) | Not Started |

### Phase 9: User Profiles

| # | Task | Description | Status |
|---|---|---|---|
| 9.1 | Profile prompt | Bottom sheet after first trade — "Set up your profile" | Not Started |
| 9.2 | Username input | @username field with uniqueness check | Not Started |
| 9.3 | PFP picker | Camera / photo library + crop | Not Started |
| 9.4 | Auto-generated avatar | Fallback avatar from wallet address for skippers | Not Started |
| 9.5 | Bio field | Optional 60-char bio input | Not Started |
| 9.6 | Profile API | Save/fetch profile to backend | Not Started |
| 9.7 | Edit profile | Edit profile from More/Settings screen | Not Started |

### Phase 10: Follow System

| # | Task | Description | Status |
|---|---|---|---|
| 10.1 | Follow button | Follow/unfollow on trader cards and profile pages | Not Started |
| 10.2 | Follow API | POST/DELETE follow, GET followers/following | Not Started |
| 10.3 | Following list | Show who you follow in Friends tab | Not Started |
| 10.4 | Follower count | Display follower/following counts on profiles | Not Started |

### Phase 11: Referral System

| # | Task | Description | Status |
|---|---|---|---|
| 11.1 | Generate code | Auto-generate unique referral code on signup | Not Started |
| 11.2 | Refer & Earn page | Show code, copy button, share sheet | Not Started |
| 11.3 | Share link | Native share sheet with referral URL | Not Started |
| 11.4 | Deep link handling | App opens with referral code → link referee to referrer | Not Started |
| 11.5 | Referral tracking | Show list of referrals + status on Refer & Earn page | Not Started |

### Phase 12: Settings & Polish

| # | Task | Description | Status |
|---|---|---|---|
| 12.1 | More/Account screen | Profile, funds, settings, support, legal sections | Not Started |
| 12.2 | Sign out | Clear auth state, navigate to login | Not Started |
| 12.3 | Haptic feedback | Add haptics on trade submit, close, follow, copy | Not Started |
| 12.4 | Loading states | Skeleton screens for market cards, positions, leaderboard | Not Started |
| 12.5 | Error handling | Graceful error states for network failures, tx errors | Not Started |
| 12.6 | Cool-off prompt | "Take a break?" after 3 consecutive losses | Not Started |

---

## V1.1 Scope

| # | Task | Status |
|---|---|---|
| V1.1-1 | Push notification infra (Expo Notifications + server) | Not Started |
| V1.1-2 | Position opened/closed push notifications | Not Started |
| V1.1-3 | Liquidation warning push (80% + 95%) | Not Started |
| V1.1-4 | Social push notifications (follow, leaderboard rank up) | Not Started |
| V1.1-5 | Limit orders (under "Advanced" on Trade screen) | Not Started |
| V1.1-6 | Take profit / stop loss inputs | Not Started |
| V1.1-7 | Price alerts | Not Started |
| V1.1-8 | Apple Pay / card deposits (Privy fiat on-ramp) | Not Started |
| V1.1-9 | Light mode theme toggle | Not Started |
| V1.1-10 | Trade privately toggle | Not Started |

## V2+ Scope

| # | Task | Status |
|---|---|---|
| V2-1 | Multiple markets live (ETH, BTC perps) | Not Started |
| V2-2 | Copy trading (auto-mirror positions) | Not Started |
| V2-3 | Shareable P&L cards (story format for IG/Twitter) | Not Started |
| V2-4 | Trading competitions with prizes | Not Started |
| V2-5 | Portfolio analytics (win rate, avg hold time) | Not Started |
| V2-6 | NFT profile pictures | Not Started |
| V2-7 | Fiat on-ramp (MoonPay/Transak) | Not Started |

---

## Success Metrics

| Metric | Target |
|---|---|
| Onboarding completion rate | >80% |
| Time from install to first trade | <90 seconds |
| Daily active traders | Track week-over-week growth |
| Average trades per user per day | >2 |
| User retention (D7) | >30% |
| App store rating | >4.5 |

---

## Decisions Made

| Question | Decision |
|---|---|
| Fiat on-ramp | Privy (handles KYC). USDC-only for V1, Privy fiat on-ramp in V1.1 |
| Multi-market | "Coming soon" cards in V1, live markets in V2 |
| KYC | Handled by Privy |
| Referral system | In V1 MVP |
| Leaderboard | In V1 MVP |
| Profile system | In V1 MVP |
| Dark/light mode | Dark only for V1, light mode in V1.1 |
| Deposit method | USDC transfer only for V1 |
| Trade privacy | Public by default, toggle to hide in V1.1 |
| Push notifications | V1.1 (infra not set up yet) |
| Copy trading | V2+ |
| App Store compliance | Review later |
| Backend for profiles | Already exists |
| Charts | TradingView Lightweight Charts in WebView — reuse web app chart code |

## Open Questions

1. **App Store compliance**: Apple's crypto app policies — review needed before submission
2. **Geo-restrictions**: Any countries to block?
3. **Referral rewards**: What does the referrer get? % of referee's fees? Fixed USDC bonus? Both?
4. **Referral cap**: Max referral rewards per user, or unlimited?

---

## Brand Kit Reference

Full brand kit: `~/Documents/qban-brand-kit.html`

### Colors

| Token | Hex | Usage |
|---|---|---|
| `qban-yellow` | `#F5C518` | Primary brand, CTAs, accents |
| `qban-yellow-light` | `#FFD94A` | Hover/active states |
| `qban-yellow-pale` | `#FFF3C4` | Subtle highlights |
| `qban-black` | `#1A1A1A` | Primary background |
| `qban-charcoal` | `#2D2D2D` | Cards, elevated surfaces |
| `qban-dark-brown` | `#3D2B1F` | Secondary surfaces |
| `qban-cigar-brown` | `#8B6914` | Secondary accents |
| `qban-tobacco` | `#C4A265` | Muted text, labels |
| `qban-tan` | `#D4B896` | Borders, dividers |
| `qban-cream` | `#F5E6CC` | Light mode surfaces |
| `qban-red` | `#CC2936` | Errors, DOWN/Short |
| `qban-smoke` | `#E8E4DF` | Light backgrounds |
| `qban-smoke-dark` | `#B8B2AA` | Secondary text |
| `qban-white` | `#FAFAF8` | Primary text (dark mode) |
| `qban-green-accent` | `#00C853` | Profit, UP/Long |
| `qban-red-accent` | `#FF1744` | Loss, DOWN/Short |

### Typography

| Font | Usage |
|---|---|
| **Bebas Neue** | Headlines, section titles, logo wordmark |
| **Space Mono** | Labels, badges, monospace data (prices, addresses) |
| **DM Sans** | Body text, UI elements, buttons |

### Brand Voice

- **Tone**: Confident, sharp, no-nonsense
- **Do**: "Trade smarter.", "Your edge, amplified."
- **Don't**: "Please consider...", "We're excited to announce..."
- Short, punchy copy. No fluff. Think cigar lounge, not boardroom.
