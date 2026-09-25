import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { fz } from '@/lib/design/tokens';
import { LineIcon, type LineIconName } from './LineIcon';

// Circular icon-button surface: #F1EDE5 fill, line icon centered.
// Matches the design's 38px header action circles.
export function IconCircle({
  icon,
  size = 38,
  iconSize = 18,
  color = fz.ink,
  fill = 'transparent',
  onPress,
  style,
}: {
  icon: LineIconName;
  size?: number;
  iconSize?: number;
  color?: string;
  fill?: string;
  onPress?: () => void;
  style?: any;
}) {
  const inner = (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: fill }, style]}>
      <LineIcon name={icon} size={iconSize} color={color} />
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.6} hitSlop={8}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
});