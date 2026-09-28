import { StyleSheet, View } from 'react-native';
import { Pill } from './Pill';

/**
 * Select-one row of pills. Replaces the
 * `<View style={pillRow}>{OPTIONS.map(o => <Pill selected onPress />)}</View>`
 * block repeated across edit / modal / relation-form / party forms.
 * `options` may carry extra keys (icon, etc.) — only value/label are read.
 */
export function PillGroup<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: readonly { value: T; label: string }[];
  value: string;
  onChange: (next: T) => void;
  style?: any;
}) {
  return (
    <View style={[styles.row, style]}>
      {options.map((opt) => (
        <Pill
          key={opt.value || 'none'}
          label={opt.label}
          selected={value === opt.value}
          onPress={() => onChange(opt.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
