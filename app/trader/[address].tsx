import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

export default function TraderProfileScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();

  return (
    <SafeAreaView className="flex-1 bg-qban-black">
      <View className="flex-1 items-center justify-center">
        <Text className="font-bebas text-4xl text-qban-white tracking-wider">
          TRADER
        </Text>
        <Text className="font-space text-sm text-qban-smoke-dark mt-2">
          {address ? `${address.slice(0, 4)}..${address.slice(-4)}` : ""}
        </Text>
      </View>
    </SafeAreaView>
  );
}
