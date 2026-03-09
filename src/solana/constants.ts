import { PublicKey } from "@solana/web3.js";

// ─── Token ──────────────────────────────────────────────────────
export const USDC_MINT = new PublicKey(
  "5PcHLtca749zFDf9WA9RBo8QbbrtQBuHx9TSGKMiThCe"
);
export const USDC_DECIMALS = 1_000_000; // 6 decimals (1 USDC = 1,000,000 atoms)

// ─── Programs ───────────────────────────────────────────────────
export const MANIFEST_PROGRAM_ID = new PublicKey(
  "3TN9efyWfeG3s1ZDZdbYtLJwMdWRRtM2xPGsM2T9QrUa"
);

export const E_TOKEN_PROGRAM_ID = new PublicKey(
  "SPLxh1LVZzEkX99H6rqYizhytLWPZVV296zyYDPagv2"
);

export const DELEGATION_PROGRAM_ID = new PublicKey(
  "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
);

export const MAGIC_PROGRAM_ID = new PublicKey(
  "Magic11111111111111111111111111111111111111"
);

export const MAGIC_CONTEXT_ID = new PublicKey(
  "MagicContext1111111111111111111111111111111"
);

// ─── Market ─────────────────────────────────────────────────────
export const BASE_MINT_INDEX = 8; // SOL market

// ─── Airdrop ────────────────────────────────────────────────────
export const AIRDROP_AMOUNT = 100_000_000; // 100 USDC in raw atoms
export const MINT_AUTHORITY_SECRET = new Uint8Array([75,85,153,37,53,221,111,44,169,138,8,47,201,185,153,94,34,223,43,94,123,240,204,229,80,252,5,173,147,48,174,133,72,195,1,240,51,193,197,94,182,80,42,237,46,251,33,104,61,25,159,123,45,140,30,148,242,80,150,232,251,253,181,249]);
