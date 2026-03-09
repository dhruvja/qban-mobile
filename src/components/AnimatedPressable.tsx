import { PropsWithChildren } from "react";
import { Pressable, type PressableProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

const AnimatedPress = Animated.createAnimatedComponent(Pressable);

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 200,
  mass: 0.8,
};

interface AnimatedPressableProps extends PressableProps {
  scaleDown?: number;
  className?: string;
}

export default function AnimatedPressable({
  children,
  scaleDown = 0.97,
  onPressIn,
  onPressOut,
  ...props
}: PropsWithChildren<AnimatedPressableProps>) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPress
      {...props}
      style={[animatedStyle, props.style]}
      onPressIn={(e) => {
        scale.value = withSpring(scaleDown, SPRING_CONFIG);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, SPRING_CONFIG);
        onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPress>
  );
}
