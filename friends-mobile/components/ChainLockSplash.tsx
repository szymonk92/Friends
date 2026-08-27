import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Svg, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { fz } from '@/lib/design/tokens';

// FriendZ splash — "09 · Chain, option C · Lock + click ring" (light).
// Two chain links slide in from ±52dp, snap together with a small overshoot,
// hold, then exit — while a click ring pulses outward at the snap moment.
// 2.8s loop, mirrors the design keyframes fz-lockL/R-lg + fz-click.
const CYCLE = 2800;

// fz-lockL-lg: -52 → 0 (ease-in-out), +3 overshoot, settle, hold, exit to -52.
const leftX = withSequence(
  withTiming(0, { duration: 1176, easing: Easing.inOut(Easing.ease) }),
  withTiming(3, { duration: 168, easing: Easing.out(Easing.ease) }),
  withTiming(0, { duration: 196, easing: Easing.in(Easing.ease) }),
  withTiming(0, { duration: 868 }),
  withTiming(-52, { duration: 392, easing: Easing.in(Easing.ease) }),
);
// fz-lockR-lg: mirror.
const rightX = withSequence(
  withTiming(0, { duration: 1176, easing: Easing.inOut(Easing.ease) }),
  withTiming(-3, { duration: 168, easing: Easing.out(Easing.ease) }),
  withTiming(0, { duration: 196, easing: Easing.in(Easing.ease) }),
  withTiming(0, { duration: 868 }),
  withTiming(52, { duration: 392, easing: Easing.in(Easing.ease) }),
);
// opacity: fade in by 18%, hold, fade out from 86%.
const linkOpacity = withSequence(
  withTiming(1, { duration: 504 }),
  withTiming(1, { duration: 1904 }),
  withTiming(0, { duration: 392 }),
);
// fz-click: hold invisible, pop to .95/.5 at the snap, expand to 1.5/0, hold.
const ringScale = withSequence(
  withTiming(0.5, { duration: 1120 }),
  withTiming(0.95, { duration: 196, easing: Easing.out(Easing.ease) }),
  withTiming(1.5, { duration: 364, easing: Easing.in(Easing.ease) }),
  withTiming(1.5, { duration: 1120 }),
);
const ringOpacity = withSequence(
  withTiming(0, { duration: 1120 }),
  withTiming(0.5, { duration: 196 }),
  withTiming(0, { duration: 364 }),
  withTiming(0, { duration: 1120 }),
);

export default function ChainLockSplash() {
  const { t } = useTranslation();

  const leftXv = useSharedValue(-52);
  const leftO = useSharedValue(0);
  const rightXv = useSharedValue(52);
  const rightO = useSharedValue(0);
  const ringS = useSharedValue(0.5);
  const ringO = useSharedValue(0);
  const textP = useSharedValue(0);

  useEffect(() => {
    leftXv.value = withRepeat(leftX, -1, false);
    leftO.value = withRepeat(linkOpacity, -1, false);
    rightXv.value = withRepeat(rightX, -1, false);
    rightO.value = withRepeat(linkOpacity, -1, false);
    ringS.value = withRepeat(ringScale, -1, false);
    ringO.value = withRepeat(ringOpacity, -1, false);
    textP.value = withTiming(1, { duration: 800 }); // fz-fade, one-shot
  }, [leftXv, leftO, rightXv, rightO, ringS, ringO, textP]);

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftXv.value }],
    opacity: leftO.value,
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightXv.value }],
    opacity: rightO.value,
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringS.value }],
    opacity: ringO.value,
  }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: textP.value,
    transform: [{ translateY: 8 * (1 - textP.value) }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: fz.paper }}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 30,
        }}
      >
        <View
          style={{
            position: 'relative',
            width: 140,
            height: 96,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Animated.View
            style={[
              ringStyle,
              {
                position: 'absolute',
                width: 80,
                height: 80,
                borderRadius: 40,
                borderWidth: 2,
                borderColor: '#111',
              },
            ]}
          />
          <View style={{ position: 'relative', width: 118, height: 80 }}>
            <Animated.View style={[leftStyle, { position: 'absolute', inset: 0 }]}>
              <Svg width={118} height={80} viewBox="0 0 110 80">
                <Rect
                  x={16}
                  y={24}
                  width={48}
                  height={40}
                  rx={13}
                  fill="none"
                  stroke="#111"
                  strokeWidth={6.5}
                />
              </Svg>
            </Animated.View>
            <Animated.View style={[rightStyle, { position: 'absolute', inset: 0 }]}>
              <Svg width={118} height={80} viewBox="0 0 110 80">
                <Rect
                  x={46}
                  y={24}
                  width={48}
                  height={40}
                  rx={13}
                  fill="none"
                  stroke="#111"
                  strokeWidth={6.5}
                />
              </Svg>
            </Animated.View>
          </View>
        </View>

        <Animated.View style={[wordmarkStyle, { alignItems: 'center' }]}>
          <Text
            style={{
              fontFamily: 'Inter',
              fontWeight: '600',
              fontSize: 28,
              color: '#111',
              letterSpacing: -0.56,
            }}
          >
            FriendZ
          </Text>
        </Animated.View>
      </View>

      <Text
        style={{
          position: 'absolute',
          bottom: 50,
          alignSelf: 'center',
          fontFamily: 'Inter',
          fontSize: 12,
          color: '#b3aea4',
          letterSpacing: 0.48,
        }}
      >
        {t('splash.connecting')}
      </Text>
    </View>
  );
}