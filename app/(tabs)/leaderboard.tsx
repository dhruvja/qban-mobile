import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LeaderboardScreen() {
  return (
    <SafeAreaView className="flex-1 bg-qban-black">
      <View className="flex-1 items-center justify-center">
        <Text className="font-bebas text-4xl text-qban-white tracking-wider">
          LEADERBOARD
        </Text>
        <Text className="text-base text-qban-smoke-dark mt-2">
          Top traders
        </Text>
      </View>
    </SafeAreaView>
  );
}
