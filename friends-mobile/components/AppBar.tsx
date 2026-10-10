import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import { HeaderBack } from '@/components/HeaderBack';
import { fz, fzText } from '@/lib/design/tokens';

/**
 * The one screen header used app-wide (native Stack headers are hidden in the
 * root/person layouts): back arrow · centered title · optional right actions.
 * SafeAreaView (not useSafeAreaInsets) so iOS sheet modals get the right top inset.
 */
export function AppBar({
  title,
  right,
  onBack = () => router.back(),
}: {
  title?: ReactNode;
  right?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.row}>
        <HeaderBack onPress={onBack} />
        <View style={styles.title}>
          {typeof title === 'string' ? (
            <Text style={fzText.screenTitle} numberOfLines={1}>
              {title}
            </Text>
          ) : (
            title
          )}
        </View>
        <View style={styles.right}>{right}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: fz.paper },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: fz.s.sm,
    paddingHorizontal: fz.s.edge,
    paddingTop: 8,
    paddingBottom: fz.s.sm,
  },
  title: { flex: 1, alignItems: 'center' },
  right: { minWidth: 38, flexDirection: 'row', justifyContent: 'flex-end', gap: fz.s.sm },
});
