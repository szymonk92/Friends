import { KeyboardAvoidingView, Modal, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import { HeaderBack } from '@/components/HeaderBack';
import { fz, fzText } from '@/lib/design/tokens';

/** Full-screen sheet with the fz app bar (back + title + trailing action), for in-screen forms/pickers. */
export function FullScreenModal({
  visible,
  onClose,
  title,
  right,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />
        <View style={styles.bar}>
          <HeaderBack onPress={onClose} />
          <Text style={[fzText.screenTitle, styles.title]} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.right}>{right}</View>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          {children}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fz.paper },
  flex: { flex: 1 },
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
