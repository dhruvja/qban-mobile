import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

export default function TradeScreen() {
  const { market } = useLocalSearchParams<{ market: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{market?.toUpperCase()}</Text>
        <Text style={styles.subtitle}>Trade screen</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FAFAF8",
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: "#B8B2AA",
    marginTop: 8,
  },
});
