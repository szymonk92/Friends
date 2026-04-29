import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { List, Text, TextInput, useTheme } from 'react-native-paper';
import { useMetLocationSuggestions } from '@/hooks/usePeople';

type Props = {
  value: string;
  onChangeText: (next: string) => void;
  label?: string;
  placeholder?: string;
};

export default function MetLocationInput({
  value,
  onChangeText,
  label = 'Where you met',
  placeholder = 'e.g. Chile, Krakow wedding, Vietnam hostel',
}: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const { data: suggestions = [] } = useMetLocationSuggestions(value);

  const visibleSuggestions = useMemo(() => {
    const trimmed = value.trim().toLowerCase();
    // hide the dropdown when the only match is exactly what's already typed
    if (!focused) return [];
    if (!suggestions.length) return [];
    if (
      suggestions.length === 1 &&
      suggestions[0].value.toLowerCase() === trimmed &&
      suggestions[0].source !== 'trip'
    ) {
      return [];
    }
    return suggestions;
  }, [suggestions, focused, value]);

  return (
    <View style={styles.wrapper}>
      <TextInput
        mode="outlined"
        label={label}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          // small delay so taps on suggestions register before blur hides them
          setTimeout(() => setFocused(false), 120);
        }}
        autoCapitalize="words"
        maxLength={120}
      />
      {visibleSuggestions.length > 0 && (
        <View style={[styles.dropdown, { backgroundColor: theme.colors.elevation.level2 }]}>
          {visibleSuggestions.map((s, idx) => {
            const meta = describe(s);
            return (
              <Pressable
                key={`${s.value}-${idx}`}
                onPress={() => {
                  onChangeText(s.value);
                  setFocused(false);
                }}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <List.Icon icon={meta.icon} color={theme.colors.onSurfaceVariant} />
                <View style={styles.rowText}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                    {s.value}
                  </Text>
                  {meta.subtitle && (
                    <Text
                      variant="bodySmall"
                      style={{ color: theme.colors.onSurfaceVariant }}
                      numberOfLines={1}
                    >
                      {meta.subtitle}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function describe(s: { source: 'history' | 'trip' | 'country'; count?: number; trip?: { name: string } }): {
  icon: string;
  subtitle?: string;
} {
  if (s.source === 'history') {
    return {
      icon: 'history',
      subtitle: s.count && s.count > 1 ? `Used ${s.count}× before` : 'Used before',
    };
  }
  if (s.source === 'trip') {
    return { icon: 'airplane', subtitle: s.trip ? `Trip: ${s.trip.name}` : 'From a trip' };
  }
  return { icon: 'earth', subtitle: 'Country' };
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    marginBottom: 16,
    zIndex: 10,
  },
  dropdown: {
    marginTop: 4,
    borderRadius: 8,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  rowText: {
    flex: 1,
    marginLeft: 4,
  },
});
