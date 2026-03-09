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

// ─── Margin Balance ─────────────────────────────────────────────

const FIXED_HEADER_SIZE = 256;
const NIL = 4_294_967_295; // u32::MAX
const CLAIMED_SEATS_ROOT_OFFSET = 76;
const RB_HEADER_SIZE = 16;
const TRADER_PUBKEY_SIZE = 32;

function walkTree(
  dynamic: Buffer,
  rootIndex: number,
  cb: (nodeIndex: number) => boolean
): boolean {
  if (rootIndex === NIL) return false;

  let idx = rootIndex;
  while (dynamic.readUInt32LE(idx) !== NIL) {
    idx = dynamic.readUInt32LE(idx);
  }

  while (true) {
    if (cb(idx)) return true;

    const right = dynamic.readUInt32LE(idx + 4);
    if (right !== NIL) {
      idx = right;
      while (dynamic.readUInt32LE(idx) !== NIL) {
        idx = dynamic.readUInt32LE(idx);
      }
      continue;
    }

    let parent = dynamic.readUInt32LE(idx + 8);
    while (parent !== NIL && dynamic.readUInt32LE(parent + 4) === idx) {
      idx = parent;
      parent = dynamic.readUInt32LE(idx + 8);
    }
    if (parent === NIL) break;
    idx = parent;
  }

  return false;
}

export async function hasSeat(
  publicKey: PublicKey,
  market: PublicKey,
  connection: Connection
): Promise<boolean> {
  const info = await connection.getAccountInfo(market);
  if (!info) return false;

  const data = Buffer.from(info.data);
  const rootIndex = data.readUInt32LE(CLAIMED_SEATS_ROOT_OFFSET);
  const dynamic = Buffer.from(data.subarray(FIXED_HEADER_SIZE));
  const traderBytes = publicKey.toBuffer();

  return walkTree(dynamic, rootIndex, (nodeIndex) => {
    const traderSlice = dynamic.subarray(
      nodeIndex + RB_HEADER_SIZE,
      nodeIndex + RB_HEADER_SIZE + TRADER_PUBKEY_SIZE
    );
    return Buffer.from(traderSlice).equals(traderBytes);
  });
}

/**
 * Get margin balance for a trader on the market.
 * Returns balance in USDC (UI units), or 0 if no seat.
 */
export async function getMarginBalance(
  connection: Connection,
  publicKey: PublicKey
): Promise<number> {
  const [market] = getMarketPda();
  const info = await connection.getAccountInfo(market);
  if (!info) return 0;

  const data = Buffer.from(info.data);
  const rootIndex = data.readUInt32LE(CLAIMED_SEATS_ROOT_OFFSET);
  const dynamic = Buffer.from(data.subarray(FIXED_HEADER_SIZE));
  const traderBytes = publicKey.toBuffer();

  let marginAtoms = 0;

  walkTree(dynamic, rootIndex, (nodeIndex) => {
    const traderSlice = dynamic.subarray(
      nodeIndex + RB_HEADER_SIZE,
      nodeIndex + RB_HEADER_SIZE + TRADER_PUBKEY_SIZE
    );
    if (Buffer.from(traderSlice).equals(traderBytes)) {
      // After trader pubkey (32 bytes), next 8 bytes = base balance, next 8 = quote balance
      const quoteOffset = nodeIndex + RB_HEADER_SIZE + TRADER_PUBKEY_SIZE + 8;
      marginAtoms = new BN(
        dynamic.subarray(quoteOffset, quoteOffset + 8),
        "le"
      ).toNumber();
      return true;
    }
    return false;
  });

  return marginAtoms / 1_000_000; // Convert atoms to USDC
}
