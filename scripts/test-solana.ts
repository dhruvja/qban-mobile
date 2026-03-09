/**
 * Test script for Solana logic — runs in Node, no Android build needed.
 * Usage: npx tsx scripts/test-solana.ts
 */
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  getMarketPda,
  getMarketVault,
  buildClaimSeat,
  buildMarketDeposit,
  buildBatchUpdate,
  OrderType,
  hasSeat,
  getMarginBalance,
} from "../src/solana/market-instructions";
import {
  getEphemeralAta,
  getTokenBalance,
  airdropUsdc,
} from "../src/solana/deposit-instructions";
import {
  USDC_MINT,
  MANIFEST_PROGRAM_ID,
  E_TOKEN_PROGRAM_ID,
  MINT_AUTHORITY_SECRET,
  BASE_MINT_INDEX,
} from "../src/solana/constants";

const DEVNET = new Connection("https://api.devnet.solana.com");
const MAGICBLOCK = new Connection("https://devnet.magicblock.app");

// Use a test wallet — replace with your actual wallet if you want
const TEST_WALLET = new PublicKey(
  Keypair.fromSecretKey(MINT_AUTHORITY_SECRET).publicKey
);

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(label: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`  ✓ ${label}`);
      passed++;
    } else {
      console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  // ─── 1. PDA Derivation (pure, no network) ───────────────────
  console.log("\n═══ PDA Derivation ═══");

  const [marketPda, marketBump] = getMarketPda();
  assert("getMarketPda returns a PublicKey", marketPda instanceof PublicKey);
  assert("market bump is a number", typeof marketBump === "number");
  console.log(`  Market PDA: ${marketPda.toBase58()}`);

  const vault = getMarketVault(marketPda, USDC_MINT);
  assert("getMarketVault returns a PublicKey", vault instanceof PublicKey);
  console.log(`  USDC Vault: ${vault.toBase58()}`);

  const [ephemeralAta, eBump] = getEphemeralAta(TEST_WALLET);
  assert("getEphemeralAta returns a PublicKey", ephemeralAta instanceof PublicKey);
  console.log(`  Ephemeral ATA: ${ephemeralAta.toBase58()}`);

  // ─── 2. Instruction Building (pure, no network) ─────────────
  console.log("\n═══ Instruction Building ═══");

  const claimSeatIx = buildClaimSeat(TEST_WALLET, marketPda);
  assert("buildClaimSeat has correct programId", claimSeatIx.programId.equals(MANIFEST_PROGRAM_ID));
  assert("buildClaimSeat has 3 keys", claimSeatIx.keys.length === 3);
  assert("buildClaimSeat data is [1]", claimSeatIx.data[0] === 1);

  const userAta = getAssociatedTokenAddressSync(USDC_MINT, TEST_WALLET);
  const depositIx = buildMarketDeposit(
    TEST_WALLET,
    marketPda,
    USDC_MINT,
    userAta,
    new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    1_000_000
  );
  assert("buildMarketDeposit has correct programId", depositIx.programId.equals(MANIFEST_PROGRAM_ID));
  assert("buildMarketDeposit has 6 keys", depositIx.keys.length === 6);
  assert("buildMarketDeposit data starts with [2]", depositIx.data[0] === 2);

  const batchIx = buildBatchUpdate(TEST_WALLET, marketPda, {
    traderIndexHint: null,
    cancels: [],
    orders: [{
      baseAtoms: 1_000_000_000, // 1 SOL
      priceMantissa: 15000,
      priceExponent: -5,
      isBid: true,
      lastValidSlot: 0,
      orderType: OrderType.ImmediateOrCancel,
    }],
  });
  assert("buildBatchUpdate has correct programId", batchIx.programId.equals(MANIFEST_PROGRAM_ID));
  assert("buildBatchUpdate has 3 keys", batchIx.keys.length === 3);
  assert("buildBatchUpdate data starts with [6]", batchIx.data[0] === 6);

  // ─── 3. On-chain Reads (needs network) ──────────────────────
  console.log("\n═══ On-chain Reads (MagicBlock) ═══");

  try {
    const seatResult = await hasSeat(TEST_WALLET, marketPda, MAGICBLOCK);
    assert("hasSeat returns boolean", typeof seatResult === "boolean");
    console.log(`  Has seat: ${seatResult}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    assert("hasSeat executes without crash", false, msg);
  }

  try {
    const position = await getMarginBalance(MAGICBLOCK, TEST_WALLET);
    assert("getMarginBalance returns PerpsPosition or null", position === null || typeof position.marginUsd === "number");
    console.log(`  Margin balance: ${position?.marginUsd ?? 0} USDC`);
    if (position) {
      console.log(`  Position: ${position.positionBase} base (${position.direction})`);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    assert("getMarginBalance executes without crash", false, msg);
  }

  // ─── 4. Devnet Token Balance ────────────────────────────────
  console.log("\n═══ Devnet Token Balance ═══");

  try {
    const balance = await getTokenBalance(TEST_WALLET, DEVNET);
    assert("getTokenBalance returns number", typeof balance === "number");
    console.log(`  Token balance: ${balance} USDC`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    assert("getTokenBalance executes without crash", false, msg);
  }

  // ─── 5. Airdrop (optional — uncomment to test) ─────────────
  // console.log("\n═══ Airdrop Test ═══");
  // const testRecipient = Keypair.generate().publicKey;
  // try {
  //   const sig = await airdropUsdc({ publicKey: testRecipient, devnetConnection: DEVNET });
  //   assert("airdropUsdc returns signature", typeof sig === "string" && sig.length > 30);
  //   console.log(`  Airdrop sig: ${sig}`);
  // } catch (e: unknown) {
  //   const msg = e instanceof Error ? e.message : String(e);
  //   assert("airdropUsdc executes without crash", false, msg);
  // }

  // ─── Summary ────────────────────────────────────────────────
  console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
