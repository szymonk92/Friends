import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput, type TextInputProps } from 'react-native-paper';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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

// Tap-to-expand header + collapsible body. Used for optional sections that
// should stay out of the way until wanted (e.g. the brain-dump on add/edit).
export function Foldable({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={styles.foldHeader}
        accessibilityRole="button"
      >
        <Text style={fzText.label}>{title}</Text>
        <Text style={fzText.sub}>{open ? t('common.hide') : t('common.show')}</Text>
      </Pressable>
      {open && children}
    </>
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
      // Apply the font to the actual input node (not just via theme) so the text
      // measure/render metrics match — otherwise Space Grotesk sits optically
      // high in the outlined box. Multiline stays top-aligned.
      contentStyle={[
        { fontFamily: fz.font },
        props.multiline ? { textAlignVertical: 'top', paddingTop: 12 } : null,
        props.contentStyle,
      ]}
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
  foldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: fz.s.md,
    marginBottom: fz.s.sm,
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
