import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";

export default function RootLayout() {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync("#1A1A1A");
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor="#1A1A1A" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#1A1A1A" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="trade/[market]" />
        <Stack.Screen name="trader/[address]" />
      </Stack>
    </>
  );
}
