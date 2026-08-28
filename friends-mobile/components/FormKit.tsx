import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Text, TextInput, type TextInputProps } from 'react-native-paper';
import type { ReactNode } from 'react';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { fz, fzText } from '@/lib/design/tokens';

// The add/edit screen shell every person sub-form shares: fz-styled nav header +
// keyboard-aware scroll + padded content, plus the standard loading / not-found
// short-circuits. Keeps connection-form / relation-form / relation screens from
// each re-deriving the same KeyboardAvoidingView + ScrollView + Stack.Screen.
export function FormScreen({
  title,
  loading = false,
  notFound = false,
  notFoundLabel = 'Not found',
  children,
}: {
  title: string;
  loading?: boolean;
  notFound?: boolean;
  notFoundLabel?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  const header = (
    <Stack.Screen
      options={{
        title,
        headerStyle: { backgroundColor: fz.paper },
        headerTintColor: fz.ink,
        headerTitleStyle: { fontFamily: fz.font, fontWeight: '600', fontSize: 18 },
        headerShadowVisible: false,
      }}
    />
  );

  if (loading) {
    return (
      <>
        {header}
        <View style={styles.screenCentered}>
          <ActivityIndicator size="large" color={fz.ink} />
        </View>
      </>
    );
  }

  if (notFound) {
    return (
      <>
        {header}
        <View style={styles.screenCentered}>
          <Text style={fzText.title}>{notFoundLabel}</Text>
          <Button
            mode="contained"
            onPress={() => router.back()}
            buttonColor={fz.ink}
            style={styles.backButton}
          >
            Go Back
          </Button>
        </View>
      </>
    );
  }

  return (
    <>
      {header}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView
          style={styles.screen}
          contentContainerStyle={{ paddingBottom: insets.bottom + fz.s.xxl }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.screenContent}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

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
  flex: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: fz.paper,
  },
  screenContent: {
    padding: fz.s.edge,
  },
  screenCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
    backgroundColor: fz.paper,
  },
  backButton: {
    borderRadius: fz.rButton,
  },
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
