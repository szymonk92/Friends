import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

interface SectionDividerProps {
  label: string;
  variant?: 'labelLarge' | 'labelMedium' | 'labelSmall';
  textStyle?: 'normal' | 'uppercase';
  marginVertical?: number;
}

/**
 * Reusable section divider component with centered label and decorative lines
 * Used for year headers in timeline, category dividers in lists, etc.
 */
export default function SectionDivider({
  label,
  variant = 'labelMedium',
  textStyle = 'normal',
  marginVertical = 20,
}: SectionDividerProps) {
  return (
    <View style={[styles.container, { marginVertical }]}>
      <View style={styles.line} />
      <Text variant={variant} style={[styles.text, textStyle === 'uppercase' && styles.uppercase]}>
        {label}
      </Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  text: {
    marginHorizontal: 16,
    fontWeight: '600',
    color: '#666',
  },
  uppercase: {
    textTransform: 'uppercase',
    fontSize: 13,
  },
});
