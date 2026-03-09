import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePrivy, useLoginWithEmail, useLoginWithOAuth } from "@privy-io/expo";
import Toast from "react-native-toast-message";
import { useUnifiedWallet } from "../../src/providers/UnifiedWalletProvider";

type Step = "choose" | "email_input" | "email_otp";

export default function LoginScreen() {
  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const { logout, user } = usePrivy();
  const { sendCode, loginWithCode, state: emailState } = useLoginWithEmail();
  const { login: loginWithOAuth, state: oauthState } = useLoginWithOAuth();
  const { connectMWA, connecting: mwaConnecting } = useUnifiedWallet();

  const isLoading =
    emailState.status === "sending-code" ||
    emailState.status === "submitting-code" ||
    oauthState.status === "loading" ||
    mwaConnecting;

  const handleEmailSend = async () => {
    try {
      // Clear any stale Privy session before starting email login
      if (user) {
        await logout();
      }
      await sendCode({ email });
      setStep("email_otp");
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Failed to send code",
        text2: err instanceof Error ? err.message : "Please try again.",
        visibilityTime: 3000,
      });
    }
  };

  const handleEmailVerify = async () => {
    try {
      await loginWithCode({ code: otp, email });
    } catch (err) {
      console.error("[login] OTP verify error:", err);
      Toast.show({
        type: "error",
        text1: "Invalid code",
        text2: err instanceof Error ? err.message : "Please check and try again.",
        visibilityTime: 3000,
      });
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    try {
      await loginWithOAuth({ provider });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Sign in failed",
        text2: err instanceof Error ? err.message : "Please try again.",
        visibilityTime: 3000,
      });
    }
  };

  const handleConnectWallet = async () => {
    try {
      await connectMWA();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect wallet";
      if (message.includes("Found no installed wallet")) {
        Toast.show({
          type: "error",
          text1: "No Wallet Found",
          text2: "Install Phantom or Solflare to connect.",
          visibilityTime: 4000,
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Connection Failed",
          text2: message,
          visibilityTime: 3000,
        });
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-qban-black">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 justify-center px-8">
          {/* Logo */}
          <View className="items-center mb-16">
            <Text className="font-bebas text-6xl text-qban-yellow tracking-widest">
              QBAN
            </Text>
            <Text className="font-dm text-base text-qban-smoke-dark mt-2">
              Trade SOL. Earn more.
            </Text>
          </View>

          {step === "choose" && (
            <View className="gap-3">
              {/* Connect Wallet (MWA) — primary CTA */}
              <Pressable
                className="bg-qban-yellow rounded-xl py-4 items-center active:bg-qban-yellow-light"
                onPress={handleConnectWallet}
                disabled={isLoading}
              >
                {mwaConnecting ? (
                  <ActivityIndicator color="#1A1A1A" size="small" />
                ) : (
                  <Text className="font-dm-bold text-base text-qban-black">
                    Connect Wallet
                  </Text>
                )}
              </Pressable>

              {/* Divider */}
              <View className="flex-row items-center my-2">
                <View className="flex-1 h-px bg-qban-charcoal" />
                <Text className="font-space text-xs text-qban-smoke-dark mx-4 uppercase tracking-widest">
                  or
                </Text>
                <View className="flex-1 h-px bg-qban-charcoal" />
              </View>

              {/* Google Sign In */}
              <Pressable
                className="bg-qban-charcoal border border-qban-tan/20 rounded-xl py-4 items-center active:opacity-80"
                onPress={() => handleOAuth("google")}
                disabled={isLoading}
              >
                {oauthState.status === "loading" ? (
                  <ActivityIndicator color="#F5C518" size="small" />
                ) : (
                  <Text className="font-dm-bold text-base text-qban-white">
                    Continue with Google
                  </Text>
                )}
              </Pressable>

              {/* Apple Sign In */}
              {Platform.OS === "ios" && (
                <Pressable
                  className="bg-qban-white rounded-xl py-4 items-center active:opacity-80"
                  onPress={() => handleOAuth("apple")}
                  disabled={isLoading}
                >
                  <Text className="font-dm-bold text-base text-qban-black">
                    Continue with Apple
                  </Text>
                </Pressable>
              )}

              {/* Email */}
              <Pressable
                className="bg-qban-charcoal border border-qban-tan/20 rounded-xl py-4 items-center active:opacity-80"
                onPress={() => setStep("email_input")}
                disabled={isLoading}
              >
                <Text className="font-dm-bold text-base text-qban-white">
                  Continue with Email
                </Text>
              </Pressable>
            </View>
          )}

          {step === "email_input" && (
            <View className="gap-4">
              <Text className="font-dm-medium text-lg text-qban-white text-center">
                Enter your email
              </Text>
              <TextInput
                className="bg-qban-charcoal border border-qban-tan/20 rounded-xl px-4 py-4 text-qban-white font-dm text-base"
                placeholder="you@email.com"
                placeholderTextColor="#B8B2AA"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
              />
              <Pressable
                className={`rounded-xl py-4 items-center ${
                  email.includes("@")
                    ? "bg-qban-yellow active:bg-qban-yellow-light"
                    : "bg-qban-charcoal"
                }`}
                onPress={handleEmailSend}
                disabled={!email.includes("@") || isLoading}
              >
                {emailState.status === "sending-code" ? (
                  <ActivityIndicator color="#1A1A1A" size="small" />
                ) : (
                  <Text
                    className={`font-dm-bold text-base ${
                      email.includes("@")
                        ? "text-qban-black"
                        : "text-qban-smoke-dark"
                    }`}
                  >
                    Send Code
                  </Text>
                )}
              </Pressable>
              <Pressable onPress={() => setStep("choose")}>
                <Text className="font-dm text-sm text-qban-smoke-dark text-center mt-2">
                  Back
                </Text>
              </Pressable>
            </View>
          )}

          {step === "email_otp" && (
            <View className="gap-4">
              <Text className="font-dm-medium text-lg text-qban-white text-center">
                Enter the code
              </Text>
              <Text className="font-dm text-sm text-qban-smoke-dark text-center -mt-2">
                Sent to {email}
              </Text>
              <TextInput
                className="bg-qban-charcoal border border-qban-tan/20 rounded-xl px-4 py-4 text-qban-white font-dm text-2xl text-center tracking-[8px]"
                placeholder="------"
                placeholderTextColor="#B8B2AA"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <Pressable
                className={`rounded-xl py-4 items-center ${
                  otp.length === 6
                    ? "bg-qban-yellow active:bg-qban-yellow-light"
                    : "bg-qban-charcoal"
                }`}
                onPress={handleEmailVerify}
                disabled={otp.length !== 6 || isLoading}
              >
                {emailState.status === "submitting-code" ? (
                  <ActivityIndicator color="#1A1A1A" size="small" />
                ) : (
                  <Text
                    className={`font-dm-bold text-base ${
                      otp.length === 6
                        ? "text-qban-black"
                        : "text-qban-smoke-dark"
                    }`}
                  >
                    Verify & Sign In
                  </Text>
                )}
              </Pressable>
              <Pressable onPress={() => setStep("email_input")}>
                <Text className="font-dm text-sm text-qban-smoke-dark text-center mt-2">
                  Back
                </Text>
              </Pressable>
            </View>
          )}

          {/* Footer */}
          <Text className="font-dm text-xs text-qban-smoke-dark text-center mt-12">
            By continuing, you agree to our Terms of Service
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
