import "fast-text-encoding";
import "react-native-get-random-values";
import "@ethersproject/shims";
import "../global.css";

import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useFonts } from "expo-font";
import { SplashScreen } from "expo-router";
import { PrivyProvider } from "@privy-io/expo";

const PRIVY_APP_ID = "cmgs9bt9n002ol10eyp3d819s";
const PRIVY_CLIENT_ID = "client-WY6Rd8TEFk3AsWL6b9EJ6ndUPDZLfwFrFR6MTLjgJNVyb";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BebasNeue: require("@expo-google-fonts/bebas-neue/400Regular/BebasNeue_400Regular.ttf"),
    SpaceMono: require("@expo-google-fonts/space-mono/400Regular/SpaceMono_400Regular.ttf"),
    "SpaceMono-Bold": require("@expo-google-fonts/space-mono/700Bold/SpaceMono_700Bold.ttf"),
    DMSans: require("@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf"),
    "DMSans-Medium": require("@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf"),
    "DMSans-Bold": require("@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf"),
  });

  useEffect(() => {
    SystemUI.setBackgroundColorAsync("#1A1A1A");
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View className="flex-1 bg-qban-black items-center justify-center">
        <ActivityIndicator color="#F5C518" size="large" />
      </View>
    );
  }

  return (
    <PrivyProvider appId={PRIVY_APP_ID} clientId={PRIVY_CLIENT_ID}>
      <StatusBar style="light" backgroundColor="#1A1A1A" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#1A1A1A" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="auth/login" options={{ animation: "fade" }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="trade/[market]" />
        <Stack.Screen name="trader/[address]" />
      </Stack>
    </PrivyProvider>
  );
}
