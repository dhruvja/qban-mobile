import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserProfile } from "../types";

const PROFILE_KEY = "qban_user_profile";
const HAS_TRADED_KEY = "qban_has_traded";
const PROFILE_PROMPT_SHOWN_KEY = "qban_profile_prompt_shown";

export async function getProfile(): Promise<UserProfile | null> {
  const data = await AsyncStorage.getItem(PROFILE_KEY);
  return data ? JSON.parse(data) : null;
}

export async function saveProfile(profile: Partial<UserProfile> & { wallet_address: string }): Promise<UserProfile> {
  const existing = await getProfile();
  const merged: UserProfile = {
    wallet_address: profile.wallet_address,
    username: profile.username ?? existing?.username ?? "",
    display_name: profile.display_name ?? existing?.display_name,
    bio: profile.bio ?? existing?.bio,
    pfp_url: profile.pfp_url ?? existing?.pfp_url,
    is_private: profile.is_private ?? existing?.is_private ?? false,
    followers_count: existing?.followers_count ?? 0,
    following_count: existing?.following_count ?? 0,
    created_at: existing?.created_at ?? new Date().toISOString(),
  };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
  return merged;
}

export async function hasCompletedProfile(): Promise<boolean> {
  const profile = await getProfile();
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
