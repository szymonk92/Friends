import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Chip, Text, TextInput, useTheme } from 'react-native-paper';
import { COMMON_LANGUAGES } from '@/lib/data/languages';

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
};

const MAX_LANGUAGES = 20;

export default function LanguagesEditor({ value, onChange }: Props) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    const lowered = draft.trim().toLowerCase();
    const existing = new Set(value.map((v) => v.toLowerCase()));
    return COMMON_LANGUAGES.filter(
      (l) => !existing.has(l.toLowerCase()) && (!lowered || l.toLowerCase().includes(lowered))
    ).slice(0, 6);
  }, [draft, value]);

  const addLanguage = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return;
    if (value.length >= MAX_LANGUAGES) return;
    const exists = value.some((v) => v.toLowerCase() === cleaned.toLowerCase());
    if (exists) {
      setDraft('');
      return;
    }
    onChange([...value, cleaned]);
    setDraft('');
  };

  const removeLanguage = (lang: string) => {
    onChange(value.filter((v) => v !== lang));
  };

  return (
    <View style={styles.container}>
      <Text variant="titleSmall" style={styles.title}>
        Languages spoken
      </Text>
      <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
        Tap a suggestion or type a custom language and press return.
      </Text>

      {value.length > 0 && (
        <View style={styles.chipsRow}>
          {value.map((lang) => (
            <Chip key={lang} compact onClose={() => removeLanguage(lang)} style={styles.chip}>
              {lang}
            </Chip>
          ))}
        </View>
      )}

      <TextInput
        mode="outlined"
        dense
        label="Add language"
        placeholder="Start typing…"
        value={draft}
        onChangeText={setDraft}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        onSubmitEditing={() => addLanguage(draft)}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        maxLength={40}
      />

      {focused && suggestions.length > 0 && (
        <View style={[styles.dropdown, { backgroundColor: theme.colors.elevation.level2 }]}>
          {suggestions.map((s) => (
            <Pressable
              key={s}
              onPress={() => addLanguage(s)}
              style={({ pressed }) => [
                styles.suggestionRow,
                pressed && { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                {s}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    marginTop: 8,
    marginBottom: 4,
  },
  hint: {
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
  dropdown: {
    marginTop: 4,
    borderRadius: 8,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  suggestionRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
