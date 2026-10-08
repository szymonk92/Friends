import { useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';
import { useLocationSuggestions, type LocationKind, type LocationSuggestion } from '@/hooks/usePeople';
import { fz, fzText } from '@/lib/design/tokens';
import { FormInput } from '@/components/FormKit';
import { tr } from '@/lib/i18n/labels';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  // Shown while the input is focused; only explicit selection hides it — NOT
  // the input's onBlur, which fires (and would unmount this list) before a
  // tap on a suggestion row below it can register as a press.
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: suggestions = [] } = useLocationSuggestions(value, kind);

  const resolvedLabel = label ?? (kind === 'home' ? t('location.whereLive') : t('location.whereMet'));
  const resolvedPlaceholder =
    placeholder ??
    (kind === 'home'
      ? t('location.homePlaceholder')
      : t('location.metPlaceholder'));

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
        onChangeText={(text) => {
          onChangeText(text);
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
      subtitle:
        s.count && s.count > 1
          ? tr('location.usedTimes', `Used ${s.count}× before`, { count: s.count })
          : tr('location.usedBefore', 'Used before'),
    };
  }
  if (s.source === 'trip') {
    return {
      icon: 'airplane',
      subtitle: s.trip
        ? tr('location.trip', `Trip: ${s.trip.name}`, { name: s.trip.name })
        : tr('location.fromTrip', 'From a trip'),
    };
  }
  return { icon: 'earth', subtitle: tr('location.country', 'Country') };
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
