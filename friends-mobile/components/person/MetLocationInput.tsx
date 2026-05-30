import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { List, Text, TextInput, useTheme } from 'react-native-paper';
import { useLocationSuggestions, type LocationKind, type LocationSuggestion } from '@/hooks/usePeople';

type Props = {
  value: string;
  onChangeText: (next: string) => void;
  kind?: LocationKind;
  label?: string;
  placeholder?: string;
};

export default function MetLocationInput({
  value,
  onChangeText,
  kind = 'met',
  label,
  placeholder,
}: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const { data: suggestions = [] } = useLocationSuggestions(value, kind);

  const resolvedLabel = label ?? (kind === 'home' ? 'Where they live' : 'Where you met');
  const resolvedPlaceholder =
    placeholder ??
    (kind === 'home'
      ? 'e.g. London, Krakow, Bay Area'
      : 'e.g. Chile, Krakow wedding, Vietnam hostel');

  const visibleSuggestions = useMemo(() => {
    const trimmed = value.trim().toLowerCase();
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
        label={resolvedLabel}
        placeholder={resolvedPlaceholder}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => {
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

function describe(s: LocationSuggestion): { icon: string; subtitle?: string } {
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
