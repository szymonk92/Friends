import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { fz, fzText } from '@/lib/design/tokens';
import { IconCircle } from '@/components/IconCircle';
import type { LineIconName } from '@/components/LineIcon';
import type { ReactNode } from 'react';

// Shared profile section shell — uppercase label + count, optional add/more
// icon circles, hairline divider. Carries the FriendZ section rhythm so every
// block on the profile reads consistently without each file re-deriving it.
export function ProfileSection({
  label,
  count,
  onAdd,
  onMore,
  addIcon = 'plus',
  moreIcon = 'more',
  actions,
  children,
  divider = true,
}: {
  label: string;
  count?: number | string | null;
  onAdd?: () => void;
  onMore?: () => void;
  addIcon?: LineIconName;
  moreIcon?: LineIconName;
  actions?: ReactNode;
  children: ReactNode;
  divider?: boolean;
}) {
  return (
    <View style={[styles.section, divider && styles.divider]}>
      <View style={styles.header}>
        <Text style={fzText.label}>
          {label}
          {count != null && count !== '' ? `  ·  ${count}` : ''}
        </Text>
        <View style={styles.actions}>
          {actions}
          {onAdd && <IconCircle icon={addIcon} size={30} iconSize={15} onPress={onAdd} />}
          {onMore && <IconCircle icon={moreIcon} size={30} iconSize={15} onPress={onMore} />}
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: fz.s.edge,
    paddingVertical: 18,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: fz.hairline,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    minHeight: 30,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});