import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { fz, fzText } from '@/lib/design/tokens';
import { LineIcon, type LineIconName } from './LineIcon';

type Variant = 'solid' | 'surface' | 'soft' | 'outline';

// solid: ink fill, white text (selected). surface: #F1EDE5 fill. soft: #F4F1EA.
// outline: white fill, #DAD4C8 border (fears / secondary).
export function Pill({
  label,
  variant = 'surface',
  selected = false,
  icon,
  onPress,
  onClose,
  style,
}: {
  label: string;
  variant?: Variant;
  selected?: boolean;
  icon?: LineIconName;
  onPress?: () => void;
  onClose?: () => void;
  style?: any;
}) {
  const v: Variant = selected ? 'solid' : variant;
  const s = styles[v];
  const text = v === 'solid' ? fzText.chipOn : v === 'outline' ? { ...fzText.chip, color: '#6B655B' } : fzText.chip;

  const inner = (
    <View style={[styles.base, s, style]}>
      {icon && <LineIcon name={icon} size={13} color={v === 'solid' ? '#fff' : fz.ink} />}
      <Text style={text}>{label}</Text>
      {onClose && <LineIcon name="close" size={12} color={v === 'solid' ? '#fff' : fz.textMute} />}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: fz.rPill,
  } as any,
  solid: { backgroundColor: fz.ink },
  surface: { backgroundColor: fz.surface },
  soft: { backgroundColor: fz.surfaceSoft },
  outline: { backgroundColor: fz.card, borderWidth: 1.5, borderColor: fz.outline },
});