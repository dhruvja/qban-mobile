import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createProfile,
  updateProfile,
  fetchProfile,
  type ApiUserProfile,
} from "../api/client";

const HAS_TRADED_KEY = "qban_has_traded";
const PROFILE_PROMPT_SHOWN_KEY = "qban_profile_prompt_shown";

export async function getProfile(
  address: string
): Promise<ApiUserProfile | null> {
  try {
    return await fetchProfile(address);
  } catch {
    return null;
  }
}

export async function saveProfile(params: {
  address: string;
  username: string;
  twitter?: string;
  telegram?: string;
}): Promise<ApiUserProfile> {
  // Try to create first, if 409 (already exists) then update
  try {
    return await createProfile(params);
  } catch (err) {
    if (err instanceof Error && err.message.includes("409")) {
      return await updateProfile(params.address, {
        username: params.username,
        twitter: params.twitter,
        telegram: params.telegram,
      });
    }
    throw err;
  }
}

export async function hasCompletedProfile(
  address: string
): Promise<boolean> {
  const profile = await getProfile(address);
  return profile !== null && profile.username.length > 0;
}

export async function setHasTraded(): Promise<void> {
  await AsyncStorage.setItem(HAS_TRADED_KEY, "true");
}

export async function getHasTraded(): Promise<boolean> {
  const val = await AsyncStorage.getItem(HAS_TRADED_KEY);
  return val === "true";
}

export async function setProfilePromptShown(): Promise<void> {
  await AsyncStorage.setItem(PROFILE_PROMPT_SHOWN_KEY, "true");
}

export async function hasProfilePromptBeenShown(): Promise<boolean> {
  const val = await AsyncStorage.getItem(PROFILE_PROMPT_SHOWN_KEY);
  return val === "true";
}

/** Validate username: 3-15 chars, alphanumeric + underscores */
export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,15}$/.test(username);
}
