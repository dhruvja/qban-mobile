import "../global.css";

import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useFonts } from "expo-font";
import { SplashScreen } from "expo-router";
import { PrivyProvider } from "@privy-io/expo";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import { ConnectionProvider } from "../src/providers/ConnectionProvider";
import { MWAProvider } from "../src/providers/MWAProvider";
import { UnifiedWalletProvider } from "../src/providers/UnifiedWalletProvider";
import { AuthProvider, useAuth } from "../src/providers/AuthProvider";
import { hasSeenOnboarding } from "./onboarding";

const PRIVY_APP_ID = "cmmiuozr8001a0clagz52qgs5";
const PRIVY_CLIENT_ID = "client-WY6Wtwo3ixFad1MY5VAcvgFuczDd24n4EJrRbjQDfAvCx";

SplashScreen.preventAutoHideAsync();

/** Redirects to login, onboarding, or tabs based on auth state */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { isReady, isAuthenticated } = useAuth();
  const segments = useSegments();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Check onboarding status once auth is ready and user is authenticated
  useEffect(() => {
    if (!isReady || !isAuthenticated) {
      setOnboardingChecked(false);
      return;
    }
    hasSeenOnboarding().then((seen) => {
      setNeedsOnboarding(!seen);
      setOnboardingChecked(true);
    });
  }, [isReady, isAuthenticated]);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === "auth";
    const inOnboarding = segments[0] === "onboarding";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/auth/login");
    } else if (isAuthenticated && inAuthGroup) {
      // Authenticated (fresh login or restored session) — go to setup
      if (onboardingChecked) {
        router.replace("/auth/setup");
      }
    } else if (isAuthenticated && inOnboarding && onboardingChecked && !needsOnboarding) {
      router.replace("/(tabs)");
    }
  }, [isReady, isAuthenticated, segments, onboardingChecked, needsOnboarding]);

  if (!isReady || (isAuthenticated && !onboardingChecked)) {
    return (
      <View className="flex-1 bg-qban-black items-center justify-center">
        <ActivityIndicator color="#F5C518" size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConnectionProvider>
        <PrivyProvider appId={PRIVY_APP_ID} clientId={PRIVY_CLIENT_ID}>
          <MWAProvider>
            <UnifiedWalletProvider>
              <AuthProvider>
                <StatusBar style="light" backgroundColor="#1A1A1A" />
                <AuthGate>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: "#1A1A1A" },
                      animation: "slide_from_right",
                    }}
                  >
                    <Stack.Screen
                      name="auth/login"
                      options={{ animation: "fade" }}
                    />
                    <Stack.Screen
                      name="auth/setup"
                      options={{ animation: "fade" }}
                    />
                    <Stack.Screen
                      name="onboarding"
                      options={{ animation: "fade" }}
                    />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="trade/[market]" />
                    <Stack.Screen name="trader/[address]" />
                    <Stack.Screen name="deposit" />
                    <Stack.Screen name="withdraw" />
                  </Stack>
                </AuthGate>
                <Toast />
              </AuthProvider>
            </UnifiedWalletProvider>
          </MWAProvider>
        </PrivyProvider>
      </ConnectionProvider>
    </GestureHandlerRootView>
  );
}
