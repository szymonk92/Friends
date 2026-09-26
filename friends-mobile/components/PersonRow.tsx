import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import type { ReactNode } from 'react';
import { Avatar } from '@/components/Avatar';
import { fz, fzText } from '@/lib/design/tokens';

interface PersonRowProps {
  name: string;
  photoPath?: string | null;
  subtitle?: string | null;
  onPress?: () => void;
  /** Trailing control: checkbox, pill, edit button… */
  right?: ReactNode;
  /** Extra lines under the subtitle. */
  children?: ReactNode;
  avatarSize?: number;
  avatarVariant?: 'surface' | 'ink';
  /** Hairline under the row, for stacked lists. */
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Avatar + name + subtitle + optional trailing control — the row every people list shares. */
export function PersonRow({
  name,
  photoPath,
  subtitle,
  onPress,
  right,
  children,
  avatarSize = 42,
  avatarVariant = 'surface',
  divider = false,
  style,
}: PersonRowProps) {
  const rowStyle = [styles.row, divider && styles.divider, style];
  const content = (
    <>
      <Avatar name={name} photoPath={photoPath} size={avatarSize} variant={avatarVariant} />
      <View style={styles.body}>
        <Text style={fzText.name} numberOfLines={1}>
          {name}
        </Text>
        {subtitle ? (
          <Text style={fzText.sub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {children}
      </View>
      {right}
    </>
  );

  return onPress ? (
    <TouchableOpacity style={rowStyle} activeOpacity={0.7} onPress={onPress}>
      {content}
    </TouchableOpacity>
  ) : (
    <View style={rowStyle}>{content}</View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: fz.hairline },
  body: { flex: 1, minWidth: 0 },
});
