import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { getInitials } from '@/lib/utils/format';
import { fz } from '@/lib/design/tokens';

interface AvatarProps {
  name: string;
  photoPath?: string | null;
  size?: number;
  /** 'surface' = light fill / ink text (default), 'ink' = dark fill / white text */
  variant?: 'surface' | 'ink';
  style?: StyleProp<ViewStyle>;
}

/** Profile photo when available, initials fallback otherwise. Shared across every people list. */
export function Avatar({ name, photoPath, size = 40, variant = 'surface', style }: AvatarProps) {
  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  if (photoPath) {
    return (
      <View style={[dimensions, { overflow: 'hidden' }, style]}>
        <Image source={{ uri: photoPath }} style={dimensions} />
      </View>
    );
  }

  const isInk = variant === 'ink';
  return (
    <View
      style={[
        styles.fallback,
        dimensions,
        { backgroundColor: isInk ? fz.ink : fz.surface },
        style,
      ]}
    >
      <Text style={[styles.text, { color: isInk ? '#fff' : fz.ink, fontSize: size * 0.36 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { justifyContent: 'center', alignItems: 'center' },
  text: { fontWeight: '600', fontFamily: fz.font },
});
