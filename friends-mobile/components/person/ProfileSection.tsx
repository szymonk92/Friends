import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { fz, fzText } from '@/lib/design/tokens';
import { LineIcon } from '@/components/LineIcon';
import { IconCircle } from '@/components/IconCircle';
import type { LineIconName } from '@/components/LineIcon';
import { useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Shared profile section shell — uppercase label + count, optional add/more
// icon circles, hairline divider. Carries the FriendZ section rhythm so every
// block on the profile reads consistently without each file re-deriving it.
export function ProfileSection({
  label,
  subtitle,
  count,
  onAdd,
  onMore,
  addIcon = 'plus',
  moreIcon = 'more',
  actions,
  children,
  divider = true,
  collapsible = false,
  defaultCollapsed = false,
  storageKey,
}: {
  label: string;
  /** Small muted line right under the header (hidden while folded). */
  subtitle?: string;
  count?: number | string | null;
  onAdd?: () => void;
  onMore?: () => void;
  addIcon?: LineIconName;
  moreIcon?: LineIconName;
  actions?: ReactNode;
  children: ReactNode;
  divider?: boolean;
  /** Tapping the header label folds/unfolds the body. */
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  /** Remember the folded state across visits (shared by all profiles). */
  storageKey?: string;
}) {
  const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed);
  const key = collapsible && storageKey ? `@friends_section_collapsed_${storageKey}` : null;

  useEffect(() => {
    if (!key) return;
    AsyncStorage.getItem(key)
      .then((v) => {
        if (v != null) setCollapsed(v === '1');
      })
      .catch(() => {});
  }, [key]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (key) AsyncStorage.setItem(key, next ? '1' : '0').catch(() => {});
  };
  const labelText = (
    <Text style={fzText.label}>
      {label}
      {count != null && count !== '' ? `  ·  ${count}` : ''}
    </Text>
  );
  return (
    <View style={[styles.section, divider && styles.divider]}>
      <View style={[styles.header, collapsed && styles.headerCollapsed, subtitle && !collapsed && styles.headerTight]}>
        {collapsible ? (
          <Pressable
            style={styles.toggle}
            onPress={toggle}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ expanded: !collapsed }}
          >
            {labelText}
            <View style={collapsed ? undefined : styles.flip}>
              <LineIcon name="chevronDown" size={14} color={fz.textMute} />
            </View>
          </Pressable>
        ) : (
          labelText
        )}
        <View style={styles.actions}>
          {actions}
          {onAdd && <IconCircle icon={addIcon} size={30} iconSize={15} onPress={onAdd} />}
          {onMore && <IconCircle icon={moreIcon} size={30} iconSize={15} onPress={onMore} />}
        </View>
      </View>
      {!collapsed && subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {!collapsed && children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: fz.s.edge,
    paddingVertical: 14,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: fz.hairline,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 30,
  },
  headerCollapsed: { marginBottom: 0 },
  headerTight: { marginBottom: 2 },
  subtitle: { ...fzText.sub, marginBottom: 8 },
  flip: { transform: [{ rotate: '180deg' }] },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});