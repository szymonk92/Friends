import { KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import { HeaderBack } from '@/components/HeaderBack';
import { fz, fzText } from '@/lib/design/tokens';

/** Custom app bar + keyboard-aware body shared by the note screens. */
export function NoteScreenShell({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />
      <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
        <HeaderBack onPress={() => router.back()} />
        <Text style={[fzText.screenTitle, styles.title]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.right}>{right}</View>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, paddingBottom: insets.bottom }}
      >
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fz.paper },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: fz.s.md,
    paddingHorizontal: fz.s.edge,
    paddingBottom: fz.s.md,
  },
  title: { flex: 1 },
  right: { minWidth: 38, alignItems: 'flex-end' },
});
