import { useCallback, useEffect, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { DEVNET_ENDPOINT, USDC_MINT, USDC_DECIMALS } from "../constants";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

async function findAssociatedTokenAddress(
  walletAddress: PublicKey,
  mintAddress: PublicKey
): Promise<PublicKey> {
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
  );
  const [address] = PublicKey.findProgramAddressSync(
    [walletAddress.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintAddress.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return address;
}

export function useUsdcBalance(walletAddress: string | null) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) {
      setBalance(0);
      return;
    }

    setLoading(true);
    try {
      const connection = new Connection(DEVNET_ENDPOINT);
      const wallet = new PublicKey(walletAddress);
      const mint = new PublicKey(USDC_MINT);
      const ata = await findAssociatedTokenAddress(wallet, mint);

      const accountInfo = await connection.getAccountInfo(ata);
      if (!accountInfo) {
        setBalance(0);
        return;
      }

      // SPL Token account data: amount is at offset 64, 8 bytes little-endian
      const data = accountInfo.data;
      const amount = data.readBigUInt64LE(64);
      setBalance(Number(amount) / 10 ** USDC_DECIMALS);
    } catch {
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, refetch: fetchBalance };
}
