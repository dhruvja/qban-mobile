import {
  followUser,
  unfollowUser,
  fetchFollowing,
  fetchProfile,
} from "../api/client";

export async function getFollowedTraders(
  myAddress: string
): Promise<string[]> {
  try {
    const data = await fetchFollowing(myAddress, 200);
    return data.items.map((u) => u.address);
  } catch {
    return [];
  }
}

export async function followTrader(
  targetAddress: string,
  myAddress: string
): Promise<void> {
  await followUser(targetAddress, myAddress);
}

export async function unfollowTrader(
  targetAddress: string,
  myAddress: string
): Promise<void> {
  await unfollowUser(targetAddress, myAddress);
}

export async function isFollowing(
  targetAddress: string,
  myAddress: string
): Promise<boolean> {
  try {
    const following = await getFollowedTraders(myAddress);
    return following.includes(targetAddress);
  } catch {
    return false;
  }
}
