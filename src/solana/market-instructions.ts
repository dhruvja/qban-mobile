import {
  Connection,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";
import { MANIFEST_PROGRAM_ID, USDC_MINT, BASE_MINT_INDEX } from "./constants";

// ─── Address Derivation ─────────────────────────────────────────

export function getMarketPda(
  baseMintIndex: number = BASE_MINT_INDEX,
  quoteMint: PublicKey = USDC_MINT
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), Buffer.from([baseMintIndex]), quoteMint.toBuffer()],
    MANIFEST_PROGRAM_ID
  );
}

export function getMarketVault(
  market: PublicKey,
  mint: PublicKey
): PublicKey {
  return getAssociatedTokenAddressSync(mint, market, true);
}

// ─── Instruction Builders ───────────────────────────────────────

const IX_CLAIM_SEAT = 1;
const IX_DEPOSIT = 2;

export function buildClaimSeat(
  payer: PublicKey,
  market: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    programId: MANIFEST_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: market, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([IX_CLAIM_SEAT]),
  });
}

export function buildMarketDeposit(
  payer: PublicKey,
  market: PublicKey,
  mint: PublicKey,
  traderToken: PublicKey,
  tokenProgram: PublicKey,
  amountAtoms: number
): TransactionInstruction {
  const vault = getMarketVault(market, mint);
  const amountBN = new BN(amountAtoms);

  const data = Buffer.concat([
    Buffer.from([IX_DEPOSIT]),
    amountBN.toArrayLike(Buffer, "le", 8),
    Buffer.from([0x00]), // trader_index_hint = None
  ]);

  return new TransactionInstruction({
    programId: MANIFEST_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: false },
      { pubkey: market, isSigner: false, isWritable: true },
      { pubkey: traderToken, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ─── On-chain Market Account Parsing (RB-tree) ─────────────────
// Ported from perp-ui/src/components/solana/market-instructions.ts

const MARKET_FIXED_SIZE = 256;
const RB_HEADER_SIZE = 16; // left(4) + right(4) + parent(4) + color(4)
const NIL = 0xffffffff;

// MarketFixed header offsets
const BASE_DECIMALS_OFFSET = 10;
const QUOTE_DECIMALS_OFFSET = 11;
const CLAIMED_SEATS_ROOT_OFFSET = 76;

// ─── Binary read helpers ────────────────────────────────────────

function readU32(buf: Uint8Array, offset: number): number {
  return (
    (buf[offset] |
      (buf[offset + 1] << 8) |
      (buf[offset + 2] << 16) |
      (buf[offset + 3] << 24)) >>> 0
  );
}

function readU64(buf: Uint8Array, offset: number): bigint {
  const lo = BigInt(readU32(buf, offset));
  const hi = BigInt(readU32(buf, offset + 4));
  return (hi << 32n) | lo;
}

function readI64(buf: Uint8Array, offset: number): bigint {
  const raw = readU64(buf, offset);
  return raw >= 0x8000000000000000n ? raw - 0x10000000000000000n : raw;
}

// ─── RB-tree helpers ────────────────────────────────────────────

function rbGetLeft(buf: Uint8Array, idx: number): number {
  return readU32(buf, idx);
}
function rbGetRight(buf: Uint8Array, idx: number): number {
  return readU32(buf, idx + 4);
}
function rbGetParent(buf: Uint8Array, idx: number): number {
  return readU32(buf, idx + 8);
}

function rbGetSuccessor(buf: Uint8Array, index: number): number {
  const right = rbGetRight(buf, index);
  if (right !== NIL) {
    let cur = right;
    while (rbGetLeft(buf, cur) !== NIL) cur = rbGetLeft(buf, cur);
    return cur;
  }
  let cur = index;
  let parent = rbGetParent(buf, cur);
  while (parent !== NIL && rbGetRight(buf, parent) === cur) {
    cur = parent;
    parent = rbGetParent(buf, cur);
  }
  return parent;
}

// ─── ClaimedSeat parsing ────────────────────────────────────────
// ClaimedSeat payload (64 bytes, after 16-byte RB node header):
//   [0..32]  trader: Pubkey
//   [32..40] lastCumulativeFunding: i64
//   [40..48] marginAtoms: u64 (= quote withdrawable balance / margin)
//   [48..56] positionAtoms: i64 (= position size in base atoms)
//   [56..64] costBasisAtoms: u64

export interface PerpsPosition {
  trader: PublicKey;
  lastCumulativeFunding: bigint;
  marginAtoms: bigint;
  marginUsd: number;
  positionAtoms: bigint;
  positionBase: number;
  costBasisAtoms: bigint;
  direction: "LONG" | "SHORT" | "FLAT";
}

function readSeat(
  buf: Uint8Array,
  index: number,
  quoteDecimals: number,
  baseDecimals: number
): PerpsPosition {
  const payloadStart = index + RB_HEADER_SIZE;
  const trader = new PublicKey(buf.slice(payloadStart, payloadStart + 32));
  const lastCumulativeFunding = readI64(buf, payloadStart + 32);
  const marginAtoms = readU64(buf, payloadStart + 40);
  const positionAtoms = readI64(buf, payloadStart + 48);
  const costBasisAtoms = readU64(buf, payloadStart + 56);

  const marginUsd = Number(marginAtoms) / 10 ** quoteDecimals;
  const positionBase = Number(positionAtoms) / 10 ** baseDecimals;
  const direction =
    positionAtoms > 0n ? "LONG" : positionAtoms < 0n ? "SHORT" : "FLAT";

  return {
    trader,
    lastCumulativeFunding,
    marginAtoms,
    marginUsd,
    positionAtoms,
    positionBase,
    costBasisAtoms,
    direction,
  };
}

function parseSeats(data: Uint8Array): PerpsPosition[] {
  const baseDecimals = data[BASE_DECIMALS_OFFSET];
  const quoteDecimals = data[QUOTE_DECIMALS_OFFSET];
  const seatsRoot = readU32(data, CLAIMED_SEATS_ROOT_OFFSET);

  if (seatsRoot === NIL) return [];

  const dynamic = data.subarray(MARKET_FIXED_SIZE);
  const results: PerpsPosition[] = [];

  let current = seatsRoot;
  while (rbGetLeft(dynamic, current) !== NIL) {
    current = rbGetLeft(dynamic, current);
  }
  results.push(readSeat(dynamic, current, quoteDecimals, baseDecimals));

  const visited = new Set<number>();
  visited.add(current);
  while (true) {
    const next = rbGetSuccessor(dynamic, current);
    if (next === NIL || visited.has(next)) break;
    visited.add(next);
    current = next;
    results.push(readSeat(dynamic, current, quoteDecimals, baseDecimals));
  }

  return results;
}

// ─── Public API ─────────────────────────────────────────────────

export async function getAllPositions(
  connection: Connection,
  marketAddress: PublicKey
): Promise<PerpsPosition[]> {
  const accountInfo = await connection.getAccountInfo(marketAddress);
  if (!accountInfo) throw new Error("Market account not found");
  return parseSeats(accountInfo.data);
}

export async function getMarginBalance(
  connection: Connection,
  publicKey: PublicKey
): Promise<PerpsPosition | null> {
  const [market] = getMarketPda();
  const accountInfo = await connection.getAccountInfo(market);
  if (!accountInfo) return null;
  const positions = parseSeats(accountInfo.data);
  return positions.find((p) => p.trader.equals(publicKey)) ?? null;
}

export async function hasSeat(
  publicKey: PublicKey,
  market: PublicKey,
  connection: Connection
): Promise<boolean> {
  const accountInfo = await connection.getAccountInfo(market);
  if (!accountInfo) return false;
  const positions = parseSeats(accountInfo.data);
  return positions.some((p) => p.trader.equals(publicKey));
}
