import { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, Alert, Image } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useAuth } from "../providers/AuthProvider";
import { saveProfile, isValidUsername, setProfilePromptShown } from "../services/profileStorage";

interface ProfileSetupSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onSaved: () => void;
}

export default function ProfileSetupSheet({ visible, onDismiss, onSaved }: ProfileSetupSheetProps) {
  const { walletAddress } = useAuth();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["85%"], []);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [pfpUri, setPfpUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPfpUri(result.assets[0].uri);
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPfpUri(result.assets[0].uri);
    }
  }, []);

  const handleChoosePhoto = useCallback(() => {
    Alert.alert("Profile Photo", "Choose a source", [
      { text: "Camera", onPress: handleTakePhoto },
      { text: "Photo Library", onPress: handlePickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [handleTakePhoto, handlePickImage]);

  const handleUsernameChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 15);
    setUsername(cleaned);
    if (cleaned.length > 0 && !isValidUsername(cleaned)) {
      setUsernameError("3-15 chars, letters, numbers & underscores");
    } else {
      setUsernameError(null);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!walletAddress) return;
    if (!isValidUsername(username)) {
      setUsernameError("Username must be 3-15 chars");
      return;
    }
    setSaving(true);
    try {
      await saveProfile({
        wallet_address: walletAddress,
        username,
        bio: bio || undefined,
        pfp_url: pfpUri || undefined,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved();
    } catch {
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [walletAddress, username, bio, pfpUri, onSaved]);

  const handleSkip = useCallback(async () => {
    await setProfilePromptShown();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onDismiss}
      backgroundStyle={{ backgroundColor: "#2A2A2A" }}
      handleIndicatorStyle={{ backgroundColor: "#B8B2AA" }}
    >
      <BottomSheetView className="flex-1 px-6 pt-2">
        <Text className="font-bebas text-2xl text-qban-white tracking-wider mb-1">
          Set Up Your Profile
        </Text>
        <Text className="font-dm text-sm text-qban-smoke mb-6">
          Nice trade! Let others see who&apos;s behind the moves.
        </Text>

        {/* PFP Picker */}
        <View className="items-center mb-6">
          <Pressable onPress={handleChoosePhoto}>
            {pfpUri ? (
              <Image
                source={{ uri: pfpUri }}
                className="w-20 h-20 rounded-full"
              />
            ) : (
              <View className="w-20 h-20 rounded-full bg-qban-charcoal items-center justify-center border-2 border-dashed border-qban-smoke-dark">
                <Text className="font-dm-bold text-2xl text-qban-smoke-dark">
                  {walletAddress?.slice(0, 2).toUpperCase() ?? "?"}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={handleChoosePhoto} className="mt-2">
            <Text className="font-dm-medium text-sm text-qban-yellow">
              Choose Photo
            </Text>
          </Pressable>
        </View>

        {/* Username */}
        <Text className="font-dm-medium text-sm text-qban-smoke mb-1.5">
          Username
        </Text>
        <View className="flex-row items-center bg-qban-charcoal rounded-xl px-4 py-3 mb-1">
          <Text className="font-space text-base text-qban-smoke-dark mr-1">@</Text>
          <TextInput
            className="flex-1 font-space text-base text-qban-white"
            placeholder="your_name"
            placeholderTextColor="#6B6560"
            value={username}
            onChangeText={handleUsernameChange}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={15}
          />
        </View>
        {usernameError ? (
          <Text className="font-space text-xs text-qban-red mb-3">{usernameError}</Text>
        ) : (
          <Text className="font-space text-xs text-qban-smoke-dark mb-3">
            3-15 chars, letters &amp; numbers
          </Text>
        )}

        {/* Bio */}
        <Text className="font-dm-medium text-sm text-qban-smoke mb-1.5">
          Bio (optional)
        </Text>
        <TextInput
          className="bg-qban-charcoal rounded-xl px-4 py-3 font-dm text-base text-qban-white mb-1"
          placeholder="What's your trading style?"
          placeholderTextColor="#6B6560"
          value={bio}
          onChangeText={(t) => setBio(t.slice(0, 60))}
          maxLength={60}
          multiline={false}
        />
        <Text className="font-space text-xs text-qban-smoke-dark mb-6 text-right">
          {bio.length}/60
        </Text>

        {/* Save */}
        <Pressable
          className={`rounded-xl py-4 items-center ${
            saving || !isValidUsername(username)
              ? "bg-qban-yellow/30"
              : "bg-qban-yellow"
          }`}
          onPress={handleSave}
          disabled={saving || !isValidUsername(username)}
        >
          <Text className="font-bebas text-lg text-qban-black tracking-wider">
            {saving ? "Saving..." : "SAVE PROFILE"}
          </Text>
        </Pressable>

        <Pressable className="py-3 items-center" onPress={handleSkip}>
          <Text className="font-dm text-sm text-qban-smoke-dark">
            Skip for now
          </Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
}
