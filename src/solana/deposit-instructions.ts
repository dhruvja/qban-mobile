import {
  PublicKey,
  Connection,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  ComputeBudgetProgram,
  Keypair,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
} from "@solana/spl-token";
import BN from "bn.js";
import {
  USDC_MINT,
  USDC_DECIMALS,
  E_TOKEN_PROGRAM_ID,
  DELEGATION_PROGRAM_ID,
  MAGIC_PROGRAM_ID,
  MAGIC_CONTEXT_ID,
  AIRDROP_AMOUNT,
  MINT_AUTHORITY_SECRET,
} from "./constants";
import { buildClaimSeat, buildMarketDeposit, getMarketPda, hasSeat } from "./market-instructions";

// ─── Instruction discriminators ─────────────────────────────────
const IX_INITIALIZE_EPHEMERAL_ATA = 0;
const IX_DEPOSIT_SPL_TOKENS = 2;
const IX_DELEGATE_EPHEMERAL_ATA = 4;
const IX_UNDELEGATE_EPHEMERAL_ATA = 5;

const BASE_MINT_INDEX = 8;

// ─── PDA Derivation ─────────────────────────────────────────────

export function getEphemeralAta(
  user: PublicKey,
  mint: PublicKey = USDC_MINT
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [user.toBuffer(), mint.toBuffer()],
    E_TOKEN_PROGRAM_ID
  );
}

function getGlobalVault(mint: PublicKey = USDC_MINT): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [mint.toBuffer()],
    E_TOKEN_PROGRAM_ID
  );
}

function getVaultTokenAccount(mint: PublicKey = USDC_MINT): PublicKey {
  const [vaultPda] = getGlobalVault(mint);
  return getAssociatedTokenAddressSync(mint, vaultPda, true);
}

// ─── Instruction Builders ───────────────────────────────────────

function buildInitializeEphemeralAta(
  payer: PublicKey,
  user: PublicKey,
  mint: PublicKey = USDC_MINT
): TransactionInstruction {
  const [ephemeralAta, bump] = getEphemeralAta(user, mint);

  return new TransactionInstruction({
    programId: E_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: ephemeralAta, isSigner: false, isWritable: true },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: user, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([IX_INITIALIZE_EPHEMERAL_ATA, bump]),
  });
}

function buildDepositSplTokens(
  user: PublicKey,
  amount: number,
  mint: PublicKey = USDC_MINT
): TransactionInstruction {
  const [ephemeralAta] = getEphemeralAta(user, mint);
  const [vault] = getGlobalVault(mint);
  const vaultToken = getVaultTokenAccount(mint);
  const userAta = getAssociatedTokenAddressSync(mint, user);

  const amountBN = new BN(amount);
  const data = Buffer.alloc(9);
  data[0] = IX_DEPOSIT_SPL_TOKENS;
  data.set(amountBN.toArrayLike(Buffer, "le", 8), 1);

  return new TransactionInstruction({
    programId: E_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: ephemeralAta, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: userAta, isSigner: false, isWritable: true },
      { pubkey: vaultToken, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

function buildDelegateEphemeralAta(
  payer: PublicKey,
  mint: PublicKey = USDC_MINT
): TransactionInstruction {
  const [ephemeralAta, bump] = getEphemeralAta(payer, mint);

  const buffer = PublicKey.findProgramAddressSync(
    [Buffer.from("buffer"), ephemeralAta.toBuffer()],
    E_TOKEN_PROGRAM_ID
  )[0];

  const delegationRecord = PublicKey.findProgramAddressSync(
    [Buffer.from("delegation"), ephemeralAta.toBuffer()],
    DELEGATION_PROGRAM_ID
  )[0];

  const delegationMetadata = PublicKey.findProgramAddressSync(
    [Buffer.from("delegation-metadata"), ephemeralAta.toBuffer()],
    DELEGATION_PROGRAM_ID
  )[0];

  return new TransactionInstruction({
    programId: E_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ephemeralAta, isSigner: false, isWritable: true },
      { pubkey: E_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: buffer, isSigner: false, isWritable: true },
      { pubkey: delegationRecord, isSigner: false, isWritable: true },
      { pubkey: delegationMetadata, isSigner: false, isWritable: true },
      { pubkey: DELEGATION_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([IX_DELEGATE_EPHEMERAL_ATA, bump]),
  });
}

function buildUndelegateEphemeralAta(
  payer: PublicKey,
  mint: PublicKey = USDC_MINT
): TransactionInstruction {
  const [ephemeralAta] = getEphemeralAta(payer, mint);
  const userAta = getAssociatedTokenAddressSync(mint, payer);

  return new TransactionInstruction({
    programId: E_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: false },
      { pubkey: userAta, isSigner: false, isWritable: true },
      { pubkey: ephemeralAta, isSigner: false, isWritable: true },
      { pubkey: MAGIC_CONTEXT_ID, isSigner: false, isWritable: true },
      { pubkey: MAGIC_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([IX_UNDELEGATE_EPHEMERAL_ATA]),
  });
}

// ─── High-Level Flows ───────────────────────────────────────────

async function isEphemeralAtaDelegated(
  user: PublicKey,
  magicblockConnection: Connection
): Promise<boolean> {
  const [ephemeralAta] = getEphemeralAta(user);
  const info = await magicblockConnection.getAccountInfo(ephemeralAta, "processed");
  return !!info;
}

async function isEphemeralAtaOnDevnet(
  user: PublicKey,
  devnetConnection: Connection
): Promise<boolean> {
  const [ephemeralAta] = getEphemeralAta(user);
  const info = await devnetConnection.getAccountInfo(ephemeralAta, "processed");
  return !!info;
}

async function pollSignatureStatus(
  connection: Connection,
  signature: string,
  maxAttempts = 30,
  intervalMs = 1000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const { value } = await connection.getSignatureStatuses([signature]);
    const status = value?.[0];
    if (status) {
      if (status.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      }
      if (
        status.confirmationStatus === "confirmed" ||
        status.confirmationStatus === "finalized"
      ) {
        return;
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Transaction confirmation timed out after ${maxAttempts}s`);
}

async function waitForAccountOnDevnet(
  user: PublicKey,
  devnetConnection: Connection,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<void> {
  const [ephemeralAta] = getEphemeralAta(user);
  for (let i = 0; i < maxAttempts; i++) {
    const info = await devnetConnection.getAccountInfo(ephemeralAta, "processed");
    if (info) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for ephemeral ATA on devnet");
}

type SignTransactionFn = (tx: Transaction) => Promise<Transaction>;

/**
 * Full deposit flow: deposit USDC into platform margin.
 * Handles ephemeral ATA init, delegation, and margin deposit.
 */
export async function depositFlow({
  publicKey,
  devnetConnection,
  magicblockConnection,
  amount,
  signTransaction,
}: {
  publicKey: PublicKey;
  devnetConnection: Connection;
  magicblockConnection: Connection;
  amount: number;
  signTransaction: SignTransactionFn;
}): Promise<{ step: string; signature: string }[]> {
  const results: { step: string; signature: string }[] = [];

  const delegated = await isEphemeralAtaDelegated(publicKey, magicblockConnection);
  const existsOnDevnet =
    !delegated && (await isEphemeralAtaOnDevnet(publicKey, devnetConnection));

  // Case 2: ATA on MagicBlock → undelegate first
  if (delegated) {
    console.log("[deposit] Undelegating ephemeral ATA...");
    const undelegateTx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      buildUndelegateEphemeralAta(publicKey)
    );
    const mbBlockhash = await magicblockConnection.getLatestBlockhash();
    undelegateTx.recentBlockhash = mbBlockhash.blockhash;
    undelegateTx.feePayer = publicKey;

    const signed = await signTransaction(undelegateTx);
    const undelegateSig = await magicblockConnection.sendRawTransaction(
      signed.serialize(),
      { skipPreflight: true }
    );
    await pollSignatureStatus(magicblockConnection, undelegateSig);
    results.push({ step: "undelegate", signature: undelegateSig });
    await waitForAccountOnDevnet(publicKey, devnetConnection);
  }

  // Build deposit tx on devnet
  const depositTx = new Transaction();
  depositTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));

  // Case 1: No ATA → initialize
  if (!delegated && !existsOnDevnet) {
    depositTx.add(buildInitializeEphemeralAta(publicKey, publicKey));
  }

  depositTx.add(buildDepositSplTokens(publicKey, amount));
  depositTx.add(buildDelegateEphemeralAta(publicKey));

  const devnetBlockhash = await devnetConnection.getLatestBlockhash();
  depositTx.recentBlockhash = devnetBlockhash.blockhash;
  depositTx.feePayer = publicKey;

  const signedDeposit = await signTransaction(depositTx);
  const depositSig = await devnetConnection.sendRawTransaction(
    signedDeposit.serialize(),
    { skipPreflight: true }
  );
  await devnetConnection.confirmTransaction(
    { signature: depositSig, ...devnetBlockhash },
    "confirmed"
  );
  results.push({ step: "deposit", signature: depositSig });

  // Margin deposit on MagicBlock
  const [market] = getMarketPda();
  const userAta = getAssociatedTokenAddressSync(USDC_MINT, publicKey);

  const marginTx = new Transaction();
  marginTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));

  const userHasSeat = await hasSeat(publicKey, market, magicblockConnection);
  if (!userHasSeat) {
    marginTx.add(buildClaimSeat(publicKey, market));
  }

  marginTx.add(
    buildMarketDeposit(publicKey, market, USDC_MINT, userAta, TOKEN_PROGRAM_ID, amount)
  );

  const mbBlockhash = await magicblockConnection.getLatestBlockhash();
  marginTx.recentBlockhash = mbBlockhash.blockhash;
  marginTx.feePayer = publicKey;

  const signedMarginTx = await signTransaction(marginTx);
  const manifestSig = await magicblockConnection.sendRawTransaction(
    signedMarginTx.serialize(),
    { skipPreflight: true }
  );
  results.push({ step: "manifest_deposit", signature: manifestSig });

  return results;
}

// ─── Airdrop ────────────────────────────────────────────────────

/**
 * Airdrop 100 USDC to the given wallet.
 * Mint authority pays for everything — no user signature needed.
 */
export async function airdropUsdc({
  publicKey,
  devnetConnection,
}: {
  publicKey: PublicKey;
  devnetConnection: Connection;
}): Promise<string> {
  const mintAuthority = Keypair.fromSecretKey(MINT_AUTHORITY_SECRET);
  const userAta = getAssociatedTokenAddressSync(USDC_MINT, publicKey);

  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      mintAuthority.publicKey,
      userAta,
      publicKey,
      USDC_MINT
    )
  );
  tx.add(createMintToInstruction(USDC_MINT, userAta, mintAuthority.publicKey, AIRDROP_AMOUNT));

  const blockhash = await devnetConnection.getLatestBlockhash();
  tx.recentBlockhash = blockhash.blockhash;
  tx.feePayer = mintAuthority.publicKey;
  tx.sign(mintAuthority);

  const sig = await devnetConnection.sendRawTransaction(tx.serialize(), {
    skipPreflight: true,
  });
  console.log("[airdrop] Tx:", sig);

  await devnetConnection.confirmTransaction(
    { signature: sig, ...blockhash },
    "confirmed"
  );
  console.log("[airdrop] Confirmed");
  return sig;
}

// ─── Balance Helpers ────────────────────────────────────────────

/**
 * Get wallet USDC token balance (in UI units).
 */
export async function getTokenBalance(
  publicKey: PublicKey,
  connection: Connection
): Promise<number> {
  const ata = getAssociatedTokenAddressSync(USDC_MINT, publicKey);
  try {
    const balance = await connection.getTokenAccountBalance(ata);
    return Number(balance.value.uiAmount ?? 0);
  } catch {
    // Account doesn't exist yet
    return 0;
  }
}
