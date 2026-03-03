import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-qban-black">
      <View className="flex-1 items-center justify-center">
        <Text className="font-bebas text-5xl text-qban-yellow tracking-widest">
          QBAN
        </Text>
        <Text className="text-base text-qban-smoke-dark mt-2">Home</Text>
      </View>
    </SafeAreaView>
  );
}
