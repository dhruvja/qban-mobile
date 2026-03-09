import { View, Text } from "react-native";
import { baseAtomsToSol, quoteAtomsToUsdc } from "../constants";

interface Fill {
  orderId: number;
  isBid: boolean;
  baseAtoms: number;
  quoteAtoms: number;
  price: number;
  blockTime: string | undefined;
}

function formatUsd(v: number): string {
  return `$${v.toFixed(2)}`;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface FillsListProps {
  fills: Fill[];
  loading?: boolean;
}

export function FillsList({ fills, loading }: FillsListProps) {
  if (loading) {
    return (
      <View className="items-center py-8">
        <Text className="font-dm text-sm text-qban-smoke-dark">
          Loading fills...
        </Text>
      </View>
    );
  }

  if (fills.length === 0) {
    return (
      <View className="items-center py-8">
        <Text className="font-dm text-sm text-qban-smoke-dark">
          No trades yet
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* Header row */}
      <View className="flex-row items-center py-2 border-b border-qban-charcoal">
        <Text className="font-space text-[10px] text-qban-smoke-dark w-14">
          SIDE
        </Text>
        <Text className="font-space text-[10px] text-qban-smoke-dark flex-1 text-right">
          SIZE
        </Text>
        <Text className="font-space text-[10px] text-qban-smoke-dark flex-1 text-right">
          PRICE
        </Text>
        <Text className="font-space text-[10px] text-qban-smoke-dark flex-1 text-right">
          VALUE
        </Text>
        <Text className="font-space text-[10px] text-qban-smoke-dark w-16 text-right">
          TIME
        </Text>
      </View>

      {fills.map((fill, index) => {
        const size = baseAtomsToSol(fill.baseAtoms);
        const value = size * fill.price;
        return (
          <View
            key={`${fill.orderId}-${index}`}
            className="flex-row items-center py-2.5 border-b border-qban-charcoal/50"
          >
            <View className="w-14">
              <View
                className={`rounded px-1.5 py-0.5 self-start ${
                  fill.isBid ? "bg-qban-green/15" : "bg-qban-red/15"
                }`}
              >
                <Text
                  className={`font-space text-[10px] ${
                    fill.isBid ? "text-qban-green" : "text-qban-red"
                  }`}
                >
                  {fill.isBid ? "BUY" : "SELL"}
                </Text>
              </View>
            </View>
            <Text className="font-space text-xs text-qban-white flex-1 text-right">
              {size.toFixed(4)} SOL
            </Text>
            <Text className="font-space text-xs text-qban-smoke flex-1 text-right">
              {formatUsd(fill.price)}
            </Text>
            <Text className="font-space text-xs text-qban-smoke flex-1 text-right">
              {formatUsd(value)}
            </Text>
            <Text className="font-space text-[10px] text-qban-smoke-dark w-16 text-right">
              {fill.blockTime ? timeAgo(fill.blockTime) : "—"}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
