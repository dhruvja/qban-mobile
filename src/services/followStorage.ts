import AsyncStorage from "@react-native-async-storage/async-storage";

const FOLLOWS_KEY = "qban_follows";

export async function getFollowedTraders(): Promise<string[]> {
  const data = await AsyncStorage.getItem(FOLLOWS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function followTrader(address: string): Promise<void> {
  const current = await getFollowedTraders();
  if (!current.includes(address)) {
    current.push(address);
    await AsyncStorage.setItem(FOLLOWS_KEY, JSON.stringify(current));
  }
}

export async function unfollowTrader(address: string): Promise<void> {
  const current = await getFollowedTraders();
  const filtered = current.filter((a) => a !== address);
  await AsyncStorage.setItem(FOLLOWS_KEY, JSON.stringify(filtered));
}

export async function isFollowing(address: string): Promise<boolean> {
  const current = await getFollowedTraders();
  return current.includes(address);
}
