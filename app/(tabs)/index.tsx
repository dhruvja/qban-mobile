import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>QBAN</Text>
        <Text style={styles.subtitle}>Home</Text>
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
    fontFamily: "BebasNeue",
    fontSize: 48,
    color: "#F5C518",
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#B8B2AA",
    marginTop: 8,
  },
});
