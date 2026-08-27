import { useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';
import { useLocationSuggestions, type LocationKind, type LocationSuggestion } from '@/hooks/usePeople';
import { fz, fzText } from '@/lib/design/tokens';
import { FormInput } from '@/components/FormKit';

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
  // Shown while the input is focused; only explicit selection hides it — NOT
  // the input's onBlur, which fires (and would unmount this list) before a
  // tap on a suggestion row below it can register as a press.
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: suggestions = [] } = useLocationSuggestions(value, kind);

  const resolvedLabel = label ?? (kind === 'home' ? 'Where they live' : 'Where you met');
  const resolvedPlaceholder =
    placeholder ??
    (kind === 'home'
      ? 'e.g. London, Krakow, Bay Area'
      : 'e.g. Chile, Krakow wedding, Vietnam hostel');

  const visibleSuggestions = useMemo(() => {
    const trimmed = value.trim().toLowerCase();
    if (!showSuggestions) return [];
    if (!suggestions.length) return [];
    if (
      suggestions.length === 1 &&
      suggestions[0].value.toLowerCase() === trimmed &&
      suggestions[0].source !== 'trip'
    ) {
      return [];
    }
    return suggestions;
  }, [suggestions, showSuggestions, value]);

  return (
    <View style={styles.wrapper}>
      <FormInput
        label={resolvedLabel}
        placeholder={resolvedPlaceholder}
        value={value}
        onChangeText={(t) => {
          onChangeText(t);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        autoCapitalize="words"
        maxLength={120}
        style={styles.input}
      />
      {visibleSuggestions.length > 0 && (
        <View style={styles.dropdown}>
          {visibleSuggestions.map((s, idx) => {
            const meta = describe(s);
            return (
              <Pressable
                key={`${s.value}-${idx}`}
                onPress={() => {
                  Keyboard.dismiss();
                  onChangeText(s.value);
                  setShowSuggestions(false);
                }}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <List.Icon icon={meta.icon} color={fz.textMute} />
                <View style={styles.rowText}>
                  <Text style={fzText.body}>{s.value}</Text>
                  {meta.subtitle && (
                    <Text style={fzText.sub} numberOfLines={1}>
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
  input: {
    marginBottom: 0,
  },
  dropdown: {
    marginTop: 4,
    borderRadius: fz.rButton,
    borderWidth: 1,
    borderColor: fz.cardBorder,
    backgroundColor: fz.card,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  rowPressed: {
    backgroundColor: fz.surfaceSoft,
  },
  rowText: {
    flex: 1,
    marginLeft: 4,
  },
});
