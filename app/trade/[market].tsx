import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

export default function TradeScreen() {
  const { market } = useLocalSearchParams<{ market: string }>();

  return (
    <SafeAreaView className="flex-1 bg-qban-black">
      <View className="flex-1 items-center justify-center">
        <Text className="font-bebas text-4xl text-qban-white tracking-wider">
          {market?.toUpperCase()}
        </Text>
        <Text className="text-base text-qban-smoke-dark mt-2">
          Trade screen
        </Text>
      </View>
    </SafeAreaView>
  );
}
