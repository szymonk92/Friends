import { StyleSheet, View } from 'react-native';
import { Text, TextInput, type TextInputProps } from 'react-native-paper';
import type { ReactNode } from 'react';
import { fz, fzText } from '@/lib/design/tokens';

// Shared fz-styled form shell — flat bordered card + rounded input, used by
// every edit/add screen so they read as one design system instead of stock
// Paper Cards/outlined inputs (elevation shadows, 4px corners, MD3 fills).
export function FormSection({
  title,
  hint,
  children,
  style,
}: {
  title?: string;
  hint?: string;
  children: ReactNode;
  style?: any;
}) {
  return (
    <View style={[styles.section, style]}>
      {title && <Text style={fzText.label}>{title}</Text>}
      {hint && <Text style={[fzText.sub, styles.hint]}>{hint}</Text>}
      <View style={title || hint ? styles.body : undefined}>{children}</View>
    </View>
  );
}

export function FormInput(props: TextInputProps) {
  return (
    <TextInput
      mode="outlined"
      outlineStyle={styles.inputOutline}
      style={[styles.input, props.style]}
      outlineColor={fz.outline}
      activeOutlineColor={fz.ink}
      textColor={fz.ink}
      placeholderTextColor={fz.textMute}
      theme={{ fonts: { bodyLarge: { fontFamily: fz.font } } }}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: fz.card,
    borderWidth: 1,
    borderColor: fz.cardBorder,
    borderRadius: fz.rCard,
    padding: fz.s.xl,
    marginBottom: fz.s.lg,
  },
  hint: {
    marginTop: 2,
  },
  body: {
    marginTop: fz.s.md,
  },
  input: {
    backgroundColor: fz.card,
    marginBottom: fz.s.md,
  },
  inputOutline: {
    borderRadius: fz.rButton,
  },
});
