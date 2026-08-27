import { TouchableOpacity, StyleSheet } from 'react-native';
import { fz } from '@/lib/design/tokens';
import { LineIcon } from './LineIcon';

// Bare back arrow matching the native Stack header's back button (Android
// homeAsUpIndicator: a stemmed left arrow, no circle). Used by custom app
// bars that hide the native header, so back stays consistent across screens.
export function HeaderBack({
  onPress,
  size = 26,
  color = fz.ink,
}: {
  onPress: () => void;
  size?: number;
  color?: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} hitSlop={8} style={styles.box}>
      <LineIcon name="arrowLeft" size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // 38px box keeps the title centered against the trailing 38px spacer;
  // arrow hugs the left edge like the native header back.
  box: { width: 38, height: 38, justifyContent: 'center' },
});