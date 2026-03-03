import { Keypair, PublicKey, Transaction, Connection } from "@solana/web3.js";
import * as SecureStore from "expo-secure-store";
import {
  API_BASE_URL,
  MANIFEST_PROGRAM_ID,
  MAGICBLOCK_ENDPOINT,
} from "../constants";

const SESSION_KEYS_PROGRAM_ID = new PublicKey(
  "KeyspM2ssCJbqUhQ4k7sveSiY4WjnYsrXkC8oDbwde5"
);

const STORE_KEY_SESSION = "qban_session_keypair";
const STORE_KEY_TOKEN = "qban_session_token";
const STORE_KEY_EXPIRY = "qban_session_expiry";

/** Session duration in seconds (60 minutes) */
const SESSION_DURATION_SECS = 60 * 60;

export interface SessionInfo {
  isActive: boolean;
  sessionKeypair: Keypair | null;
  sessionToken: PublicKey | null;
  expiresAt: number | null;
}

// ─── READ ────────────────────────────────────────────────────────────

export async function getSessionInfo(): Promise<SessionInfo> {
  const [secretB64, tokenB58, expiryStr] = await Promise.all([
    SecureStore.getItemAsync(STORE_KEY_SESSION),
    SecureStore.getItemAsync(STORE_KEY_TOKEN),
    SecureStore.getItemAsync(STORE_KEY_EXPIRY),
  ]);

  if (!secretB64 || !tokenB58 || !expiryStr) {
    return { isActive: false, sessionKeypair: null, sessionToken: null, expiresAt: null };
  }

  const expiresAt = Number(expiryStr);
  if (Date.now() / 1000 > expiresAt) {
    await clearSession();
    return { isActive: false, sessionKeypair: null, sessionToken: null, expiresAt: null };
  }

  const secretKey = Uint8Array.from(Buffer.from(secretB64, "base64"));
  return {
    isActive: true,
    sessionKeypair: Keypair.fromSecretKey(secretKey),
    sessionToken: new PublicKey(tokenB58),
    expiresAt,
  };
}

export async function hasValidSession(): Promise<boolean> {
  const info = await getSessionInfo();
  return info.isActive;
}

// ─── CREATE ──────────────────────────────────────────────────────────

export async function createSession(
  walletAddress: string,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<SessionInfo> {
  const currentTime = Date.now() / 1000;
  const validUntil = Math.floor(currentTime + SESSION_DURATION_SECS);
  const sessionKeypair = Keypair.generate();

  // Ask backend to build the session-creation transaction
  const response = await fetch(`${API_BASE_URL}/session/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creator: walletAddress,
      session_pubkey: sessionKeypair.publicKey.toString(),
      valid_until: validUntil,
    }),
  });

  if (!response.ok) {
    throw new Error("Session creation failed");
  }

  const { serialized_transaction } = (await response.json()) as {
    serialized_transaction: string;
  };

  if (!serialized_transaction) {
    throw new Error("No transaction returned from session API");
  }

  // Sign with both the ephemeral key and the user's wallet
  const txBuffer = Buffer.from(serialized_transaction, "base64");
  const tx = Transaction.from(txBuffer);
  tx.partialSign(sessionKeypair);
  const signedTx = await signTransaction(tx);

  // Send via MagicBlock endpoint
  const connection = new Connection(MAGICBLOCK_ENDPOINT, "confirmed");
  const sig = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(sig, "confirmed");

  // Derive session token PDA
  const manifestProgramId = new PublicKey(MANIFEST_PROGRAM_ID);
  const walletPubkey = new PublicKey(walletAddress);
  const [sessionToken] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("session_token_v2"),
      manifestProgramId.toBuffer(),
      sessionKeypair.publicKey.toBuffer(),
      walletPubkey.toBuffer(),
    ],
    SESSION_KEYS_PROGRAM_ID
  );

  // Store in SecureStore (encrypted at the OS level)
  const secretB64 = Buffer.from(sessionKeypair.secretKey).toString("base64");
  await Promise.all([
    SecureStore.setItemAsync(STORE_KEY_SESSION, secretB64),
    SecureStore.setItemAsync(STORE_KEY_TOKEN, sessionToken.toBase58()),
    SecureStore.setItemAsync(STORE_KEY_EXPIRY, String(validUntil)),
  ]);

  return {
    isActive: true,
    sessionKeypair,
    sessionToken,
    expiresAt: validUntil,
  };
}

// ─── CLEAR ───────────────────────────────────────────────────────────

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(STORE_KEY_SESSION),
    SecureStore.deleteItemAsync(STORE_KEY_TOKEN),
    SecureStore.deleteItemAsync(STORE_KEY_EXPIRY),
  ]);
}
