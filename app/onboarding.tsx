import { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  useWindowDimensions,
  type ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const ONBOARDING_KEY = "qban_onboarding_seen";

interface Card {
  id: string;
  emoji: string;
  title: string;
  body: string;
}

const CARDS: Card[] = [
  {
    id: "direction",
    emoji: "\u2195\uFE0F",
    title: "Pick a direction",
    body: "Think SOL is going up? Tap Up.\nThink it's going down? Tap Down.",
  },
  {
    id: "amount",
    emoji: "\uD83D\uDCB0",
    title: "Set your amount",
    body: "Choose how much to trade and\nyour multiplier. Start small.",
  },
  {
    id: "profit",
    emoji: "\uD83D\uDCC8",
    title: "Watch your profit",
    body: "See your P&L update in real-time.\nClose anytime to lock in gains.",
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<Card>>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    router.replace("/(tabs)");
  };

  const isLast = activeIndex === CARDS.length - 1;

  const handleNext = () => {
    if (isLast) {
      finish();
    } else {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-qban-black">
      <View className="flex-1">
        {/* Skip button */}
        <View className="items-end px-6 pt-2">
          <Pressable onPress={finish} hitSlop={12}>
            <Text className="font-dm text-sm text-qban-smoke-dark">Skip</Text>
          </Pressable>
        </View>

        {/* Cards */}
        <FlatList
          ref={flatListRef}
          data={CARDS}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          renderItem={({ item }) => (
            <View
              style={{ width }}
              className="flex-1 justify-center items-center px-12"
            >
              <Text className="text-6xl mb-6">{item.emoji}</Text>
              <Text className="font-bebas text-4xl text-qban-yellow text-center tracking-wider mb-4">
                {item.title}
              </Text>
              <Text className="font-dm text-base text-qban-smoke text-center leading-6">
                {item.body}
              </Text>
            </View>
          )}
        />

        {/* Dots + CTA */}
        <View className="px-8 pb-8">
          {/* Dots */}
          <View className="flex-row justify-center gap-2 mb-6">
            {CARDS.map((card, i) => (
              <View
                key={card.id}
                className={`h-2 rounded-full ${
                  i === activeIndex
                    ? "w-6 bg-qban-yellow"
                    : "w-2 bg-qban-charcoal"
                }`}
              />
            ))}
          </View>

          {/* CTA */}
          <Pressable
            className="bg-qban-yellow rounded-xl py-4 items-center active:bg-qban-yellow-light"
            onPress={handleNext}
          >
            <Text className="font-dm-bold text-base text-qban-black">
              {isLast ? "Start Trading" : "Next"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

/** Check if user has completed onboarding */
export async function hasSeenOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY);
  return value === "1";
}
