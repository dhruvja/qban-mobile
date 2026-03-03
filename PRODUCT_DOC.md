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

## UX Polish — What Makes It Feel World-Class

This section defines every micro-interaction, animation, and tactile detail that separates a "good" app from one that feels **impossibly smooth**. Every item here is a must-have.

### Animations & Transitions

| Where | Animation | Library |
|---|---|---|
| Screen transitions | Shared element transitions between Home → Trade (market card morphs into trade header) | `react-native-reanimated` + Expo Router |
| Bottom sheets | Spring-physics sheet that follows your finger, flings open/closed, snaps to detents | `@gorhom/bottom-sheet` |
| Tab bar | Active tab icon scales up with spring bounce + label fades in | `react-native-reanimated` |
| Market cards | Subtle press-in scale (0.97) on touch down, spring back on release | `Pressable` + `useAnimatedStyle` |
| P&L numbers | Numbers count up/down smoothly when price changes (slot machine effect) | `react-native-reanimated` interpolation |
| Price ticker | Color flash — green pulse on price up, red pulse on price down, fades over 400ms | Animated background color |
| Chart load | Chart fades in from 0 opacity with slight slide-up after WebView loads | `Animated.timing` |
| Position card | Slides in from bottom with spring when first position opens | Layout animation |
| Trade submit | Button compresses → spinner → checkmark morph → success | Lottie or reanimated sequence |
| Leaderboard ranks | Staggered fade-in of cards (50ms delay between each) on first load | `FlatList` + entering animation |
| Follow button | Heart/check icon pops with scale overshoot (1.0 → 1.3 → 1.0) | Spring animation |
| Referral copy | "Copied!" tooltip slides up, holds 1.5s, fades out | Animated translateY + opacity |

### Haptic Feedback

Every important touch point gets haptic feedback via `expo-haptics`:

| Action | Haptic Type |
|---|---|
| Tap Up/Down direction | `ImpactFeedbackStyle.Medium` |
| Slide multiplier to a preset notch | `ImpactFeedbackStyle.Light` (tick on each notch) |
| Tap "Open Position" | `ImpactFeedbackStyle.Heavy` |
| Trade confirmed | `NotificationFeedbackType.Success` |
| Trade failed | `NotificationFeedbackType.Error` |
| Pull-to-refresh hits threshold | `ImpactFeedbackStyle.Medium` |
| Close position confirm | `ImpactFeedbackStyle.Heavy` |
| Copy referral code | `NotificationFeedbackType.Success` |
| Follow someone | `ImpactFeedbackStyle.Light` |
| Long-press on position card | `ImpactFeedbackStyle.Medium` |

### Gestures

| Gesture | Where | Action |
|---|---|---|
| Swipe down | Any list screen | Pull-to-refresh with custom QBAN-yellow spinner |
| Swipe left on position card | Portfolio | Reveals "Close" action button (like iOS mail swipe) |
| Swipe between tabs | Leaderboard sub-tabs | Pan between Top Traders / Friends / Feed |
| Pinch to zoom | Trade chart | Zoom in/out on price chart (handled by WebView) |
| Long press | Market card on Home | Quick-peek bottom sheet with market stats |
| Long press | Trader card on Leaderboard | Quick-preview of trader profile without navigating |
| Swipe right | Trade/Profile screens | Native back navigation |
| Double tap | Position P&L | Copies P&L value to clipboard |

### Loading States

**No screen should ever feel empty or frozen.** Every data-dependent view needs a loading state:

| Screen | Loading State |
|---|---|
| Home — market cards | Skeleton cards with shimmering pulse animation (charcoal → dark-brown → charcoal) |
| Home — balance | Skeleton rectangle for balance, shimmering |
| Trade — chart | Skeleton chart area with faint grid lines, shimmers until WebView renders |
| Portfolio — position | Skeleton card matching position card dimensions |
| Portfolio — history | Skeleton rows (3-4) with shimmering |
| Leaderboard — traders | Skeleton cards with circle (pfp) + rectangles (text) |
| Feed | Skeleton feed items with shimmer |
| Any data refresh | Subtle spinner at top (not blocking the existing content — show stale data while refreshing) |

Skeleton shimmer colors: `qban-charcoal` (#2D2D2D) → `qban-dark-brown` (#3D2B1F) → `qban-charcoal`

### Real-Time Feel

The app must feel **alive**, not static:

| Feature | Implementation |
|---|---|
| Price updates | Pyth WebSocket streams price every ~400ms. Animate number transitions smoothly, don't just swap text. |
| P&L updates | Recalculate and animate P&L every price tick. Color intensity scales with P&L magnitude. |
| Feed updates | New items slide in at top of feed with fade-in. Badge count on Feed tab updates in real-time. |
| Orderbook pulse | (hidden from users but) trade activity drives a subtle "pulse" ring on the market card when volume spikes. |
| Balance update | After deposit detected, balance counts up from old → new value (slot machine animation). |
| Position liquidation proximity | Position card border color shifts from green → yellow → orange → red as price approaches liquidation. |

### Shareable P&L Cards (FOMO-style)

When a user closes a position, offer a **shareable P&L card** — a beautiful branded image they can post to Instagram/Twitter/iMessage:

```
┌──────────────────────────────────┐
│                                  │
│           QBAN EXCHANGE          │
│                                  │
│     ┌──────────────────────┐     │
│     │                      │     │
│     │     +$320.50         │     │
│     │     +64.1%           │     │
│     │                      │     │
│     │  SOL/USD  •  UP  5x  │     │
│     │  $142.35 → $156.80   │     │
│     │  Held for 2h 14m     │     │
│     │                      │     │
│     └──────────────────────┘     │
│                                  │
│  @cigarking  •  qban.exchange    │
│                                  │
│  [Share to Stories] [Save Image] │
│                                  │
└──────────────────────────────────┘
```

- Auto-generated after closing a profitable position (optional for losses too)
- Uses brand colors (yellow/black) — free marketing every time someone shares
- Includes username and app branding
- Share via native share sheet (Instagram Stories, Twitter, iMessage, etc.)
- Render using `react-native-view-shot` to capture as image

### Empty States

Every screen needs a designed empty state — not just blank space:

| Screen | Empty State |
|---|---|
| Portfolio — no positions | Illustration + "No positions yet. Ready to make your first trade?" + [Trade Now] button |
| Portfolio — no history | "Your trade history will appear here after your first trade." |
| Leaderboard — Friends tab (no follows) | "Follow traders to see them here." + [Explore Traders] button |
| Feed — no activity | "Nothing happening yet. Be the first to trade!" |
| Referrals — none yet | "Share your code and earn when friends trade." + [Share Code] button |
| Deposit — zero balance | "Deposit USDC to start trading." + [Deposit] button — prominent, not subtle |

### Error States

Errors should feel **recoverable**, not scary:

| Error | UX |
|---|---|
| Network offline | Persistent top banner: "You're offline. Data may be outdated." — show stale cached data, don't block the app |
| Trade failed (tx error) | Toast with error: "Trade didn't go through. Try again." + [Retry] button |
| Price feed stale | Subtle "(delayed)" label next to price — don't hide the price entirely |
| WebSocket disconnected | Auto-reconnect silently. Show spinner on affected data while reconnecting. |
| Session key expired | Auto-renew silently. If renewal fails, prompt: "Tap to re-enable 1-click trading." |
| Deposit not detected yet | "Waiting for deposit... This usually takes under 30 seconds." + spinning animation |

### Sound Design (Optional but Differentiating)

Subtle, optional audio cues that can be toggled off:

| Event | Sound |
|---|---|
| Trade confirmed | Satisfying "ka-ching" coin sound |
| Position closed in profit | Cash register ding |
| New follower | Soft pop notification |
| Leaderboard rank up | Level-up chime |

Toggle in settings: "Trade Sounds [on/off]"

### Thumb-Zone Optimization

All primary actions must be reachable with one thumb on large phones:

- **Bottom tab bar**: Primary navigation always within thumb reach
- **Trade button**: "Open Position" is at the bottom of the screen, not the top
- **Close position buttons**: Bottom of the position card, not top
- **Direction picker (Up/Down)**: Middle of screen, not top
- **Multiplier presets**: Inline buttons below slider, within thumb zone
- **Confirmation sheets**: Slide up from bottom — confirm button at the very bottom edge

### Perceived Performance

Even when things are loading, the app should **feel instant**:

| Technique | Where |
|---|---|
| Optimistic updates | After submitting a trade, immediately show it in Portfolio before tx confirms. Roll back on failure. |
| Prefetch | When user opens Trade screen, prefetch orderbook data in background for faster execution |
| Cache-first | Show cached prices/positions on app launch, refresh silently in background |
| Image caching | Cache PFPs with `expo-image` (built-in caching). Never re-download the same avatar. |
| Screen preload | Preload adjacent tab screens so switching tabs is instant (no blank screen flash) |
| Warm WebView | Initialize chart WebView on app startup (hidden), so it's ready when user opens Trade |

---

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
| Animations | `react-native-reanimated` 3 |
| Bottom Sheets | `@gorhom/bottom-sheet` |
| Styling | NativeWind (Tailwind for RN) |
| Haptics | `expo-haptics` |
| Images | `expo-image` (built-in caching) |
| Skeletons | `moti/skeleton` (reanimated-powered shimmer) |
| Screenshot/Share | `react-native-view-shot` + `expo-sharing` |
| Gestures | `react-native-gesture-handler` |

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
| 1.1 | Expo project init | `npx create-expo-app` with TypeScript template | Done |
| 1.2 | Expo Router setup | File-based routing with bottom tab layout | Done |
| 1.3 | NativeWind config | Tailwind CSS setup with QBAN brand colors/fonts | Done |
| 1.4 | Dark theme | Global dark theme using brand kit (qban-black, charcoal, yellow) | Done |
| 1.5 | Custom fonts | Load Bebas Neue, Space Mono, DM Sans via expo-font | Done |
| 1.6 | Shared types | Copy/adapt TypeScript types from perp-ui (orders, positions, market data) | Done |
| 1.7 | API client | REST client for `tapguru.fun/api/v1/` endpoints | Done |
| 1.8 | WebSocket client | WS connection for orderbook + fills + price updates | Done |

### Phase 2: Auth & Wallet

| # | Task | Description | Status |
|---|---|---|---|
| 2.1 | Privy SDK setup | Install & configure `@privy-io/expo` | Done |
| 2.2 | Login screen | Email / Apple / Google sign-in UI | Done |
| 2.3 | Embedded wallet | Auto-create Solana wallet on signup (no seed phrase) | Done |
| 2.4 | Session keys | Port 1-click trading (ephemeral keypairs) — swap IndexedDB for SecureStore | Done |
| 2.5 | Auth state | Auth context — logged in/out state, auto-reconnect | Done |

### Phase 3: Onboarding

| # | Task | Description | Status |
|---|---|---|---|
| 3.1 | Welcome screen | "Trade SOL. Earn more." with CTA | Done |
| 3.2 | Tutorial cards | 3 swipeable cards explaining Up/Down, Amount, Profit | Done |
| 3.3 | Skip + remember | Tutorial only on first launch, skip button, AsyncStorage flag | Done |

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

### Phase 12: Settings & Account

| # | Task | Description | Status |
|---|---|---|---|
| 12.1 | More/Account screen | Profile, funds, settings, support, legal sections | Not Started |
| 12.2 | Sign out | Clear auth state, navigate to login | Not Started |
| 12.3 | Cool-off prompt | "Take a break?" after 3 consecutive losses | Not Started |

### Phase 13: Animations & Micro-Interactions

| # | Task | Description | Status |
|---|---|---|---|
| 13.1 | Shared element transitions | Market card morphs into Trade screen header on navigation | Not Started |
| 13.2 | Bottom sheet physics | Spring-physics sheets that follow finger, snap to detents (`@gorhom/bottom-sheet`) | Not Started |
| 13.3 | Card press animation | Subtle scale-down (0.97) on touch, spring back on release for all tappable cards | Not Started |
| 13.4 | P&L number animation | Slot-machine count up/down effect on P&L and price changes | Not Started |
| 13.5 | Price color flash | Green pulse on price up, red pulse on price down (400ms fade) | Not Started |
| 13.6 | Trade submit animation | Button compresses → spinner → checkmark morph → success state | Not Started |
| 13.7 | Tab bar animation | Active tab icon scales up with spring bounce + label fade | Not Started |
| 13.8 | Leaderboard stagger | Cards fade in with 50ms stagger delay on first load | Not Started |
| 13.9 | Follow button pop | Scale overshoot (1.0 → 1.3 → 1.0) on follow/unfollow | Not Started |
| 13.10 | Balance count-up | After deposit, balance animates from old → new value | Not Started |
| 13.11 | Position card slide-in | Spring slide-in from bottom when position first opens | Not Started |
| 13.12 | Feed new item animation | New feed items slide in at top with fade-in | Not Started |

### Phase 14: Haptics & Gestures

| # | Task | Description | Status |
|---|---|---|---|
| 14.1 | Trade haptics | Direction pick (medium), multiplier notch (light), submit (heavy), confirm (success) | Not Started |
| 14.2 | Position haptics | Close confirm (heavy), long-press (medium) | Not Started |
| 14.3 | Social haptics | Follow (light), copy referral (success), new follower (light) | Not Started |
| 14.4 | Pull-to-refresh haptic | Medium impact when refresh threshold is hit | Not Started |
| 14.5 | Swipe-to-close position | Swipe left on position card reveals "Close" action (iOS mail-style) | Not Started |
| 14.6 | Swipe between tabs | Pan gesture to swipe between Leaderboard sub-tabs | Not Started |
| 14.7 | Long-press market card | Quick-peek bottom sheet with market stats | Not Started |
| 14.8 | Long-press trader card | Quick-preview of trader profile without navigating | Not Started |
| 14.9 | Double-tap P&L | Copies P&L value to clipboard | Not Started |

### Phase 15: Loading, Empty & Error States

| # | Task | Description | Status |
|---|---|---|---|
| 15.1 | Skeleton shimmer | Shimmer animation using brand colors (charcoal → dark-brown → charcoal) | Not Started |
| 15.2 | Home skeletons | Skeleton cards for balance + market cards | Not Started |
| 15.3 | Trade chart skeleton | Skeleton with faint grid lines until WebView renders | Not Started |
| 15.4 | Portfolio skeletons | Skeleton position card + history rows | Not Started |
| 15.5 | Leaderboard skeletons | Skeleton cards with circle (pfp) + text rectangles | Not Started |
| 15.6 | Empty — no positions | Illustration + "Ready to make your first trade?" + CTA | Not Started |
| 15.7 | Empty — no history | "Your trade history will appear here." | Not Started |
| 15.8 | Empty — no friends | "Follow traders to see them here." + CTA | Not Started |
| 15.9 | Empty — no referrals | "Share your code and earn when friends trade." + CTA | Not Started |
| 15.10 | Error — offline banner | Persistent top banner: "You're offline" — show stale cached data | Not Started |
| 15.11 | Error — trade failed | Toast: "Trade didn't go through. Try again." + Retry | Not Started |
| 15.12 | Error — price stale | "(delayed)" label next to price when feed drops | Not Started |
| 15.13 | Error — WS reconnect | Auto-reconnect silently, spinner on affected data | Not Started |
| 15.14 | Error — session expired | Auto-renew or prompt "Tap to re-enable 1-click trading" | Not Started |

### Phase 16: Perceived Performance

| # | Task | Description | Status |
|---|---|---|---|
| 16.1 | Optimistic trade updates | Show position in Portfolio immediately before tx confirms, rollback on failure | Not Started |
| 16.2 | Prefetch orderbook | Background fetch orderbook data when Trade screen is opened | Not Started |
| 16.3 | Cache-first loading | Show cached prices/positions on launch, refresh silently in background | Not Started |
| 16.4 | PFP image caching | Use `expo-image` with built-in caching for all profile pictures | Not Started |
| 16.5 | Screen preloading | Preload adjacent tab screens so tab switching is instant | Not Started |
| 16.6 | Warm WebView | Initialize chart WebView on app startup (hidden) so it's ready instantly | Not Started |

### Phase 17: Shareable P&L Cards

| # | Task | Description | Status |
|---|---|---|---|
| 17.1 | P&L card design | Branded card (yellow/black) with P&L, trade details, username | Not Started |
| 17.2 | Card rendering | `react-native-view-shot` to capture card as image | Not Started |
| 17.3 | Share sheet | Native share to Instagram Stories, Twitter, iMessage via `expo-sharing` | Not Started |
| 17.4 | Auto-prompt | Show "Share your win?" after closing a profitable position | Not Started |
| 17.5 | Save to camera roll | Option to save P&L card image locally | Not Started |

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
