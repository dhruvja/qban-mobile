import { useState, useEffect, useRef, useCallback } from "react";
import { MAGICBLOCK_WS_ENDPOINT, PYTH_SOL_USD_FEED } from "../constants";

const RECONNECT_DELAY_MS = 2000;

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64.replace(/=/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToNumber(bytes: Uint8Array, offset: number): number {
  let result = BigInt(0);
  for (let i = 0; i < 8; i++) {
    result |= BigInt(bytes[offset + i]) << BigInt(i * 8);
  }
  return Number(result);
}

export function usePythPrice(feedAddress: string = PYTH_SOL_USD_FEED) {
  const [price, setPrice] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    const ws = new WebSocket(MAGICBLOCK_WS_ENDPOINT);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "accountSubscribe",
          params: [
            feedAddress,
            { encoding: "jsonParsed", commitment: "confirmed" },
          ],
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(
          typeof event.data === "string" ? event.data : ""
        );
        if (msg.method !== "accountNotification") return;

        const base64 = msg.params?.result?.value?.data?.[0];
        if (!base64) return;

        const bytes = base64ToBytes(base64);
        if (bytes.length < 81) return;

        const rawPrice = bytesToNumber(bytes, 73);
        setPrice(rawPrice / 1e8);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
      retryRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };
  }, [feedAddress]);

  useEffect(() => {
    connect();
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { price, connected };
}
