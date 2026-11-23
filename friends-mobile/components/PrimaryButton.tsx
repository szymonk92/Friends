import { StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { fz, fzText } from '@/lib/design/tokens';

/** The fz call-to-action: ink fill (solid) or ink outline, 50px tall, rButton corners. */
export function PrimaryButton({
  label,
  onPress,
  variant = 'solid',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'outline';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={[styles.base, variant === 'solid' ? styles.solid : styles.outline, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={variant === 'solid' ? fzText.btn : fzText.btnOutline}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: fz.rButton,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  solid: { backgroundColor: fz.ink },
  outline: { borderWidth: 1.5, borderColor: fz.ink },
  disabled: { opacity: 0.4 },
});
