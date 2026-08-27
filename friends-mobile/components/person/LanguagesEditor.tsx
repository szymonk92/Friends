import { useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { COMMON_LANGUAGES } from '@/lib/data/languages';
import { fz, fzText } from '@/lib/design/tokens';
import { Pill } from '@/components/Pill';
import { FormInput } from '@/components/FormKit';

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
};

const MAX_LANGUAGES = 20;

export default function LanguagesEditor({ value, onChange }: Props) {
  const [draft, setDraft] = useState('');
  // Shown while the input is focused; only explicit selection/submit hides it —
  // NOT the input's onBlur, which fires (and would unmount this list) before a
  // tap on a suggestion row below it can register as a press.
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    const lowered = draft.trim().toLowerCase();
    const existing = new Set(value.map((v) => v.toLowerCase()));
    return COMMON_LANGUAGES.filter(
      (l) => !existing.has(l.toLowerCase()) && (!lowered || l.toLowerCase().includes(lowered))
    ).slice(0, 6);
  }, [draft, value]);

  const addLanguage = (raw: string) => {
    const cleaned = raw.trim();
    setShowSuggestions(false);
    // Dismissing first ends the IME's composing session — otherwise Samsung's
    // keyboard can re-assert its in-progress composing text over the cleared
    // controlled value a beat later.
    Keyboard.dismiss();
    setDraft('');
    if (!cleaned) return;
    if (value.length >= MAX_LANGUAGES) return;
    const exists = value.some((v) => v.toLowerCase() === cleaned.toLowerCase());
    if (exists) return;
    onChange([...value, cleaned]);
  };

  const removeLanguage = (lang: string) => {
    onChange(value.filter((v) => v !== lang));
  };

  return (
    <View style={styles.container}>
      <Text style={fzText.label}>Languages spoken</Text>
      <Text style={[fzText.sub, styles.hint]}>
        Tap a suggestion or type a custom language and press return.
      </Text>

      {value.length > 0 && (
        <View style={styles.chipsRow}>
          {value.map((lang) => (
            <Pill key={lang} label={lang} onClose={() => removeLanguage(lang)} />
          ))}
        </View>
      )}

      <FormInput
        dense
        label="Add language"
        placeholder="Start typing…"
        value={draft}
        onChangeText={(t) => {
          setDraft(t);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onSubmitEditing={() => addLanguage(draft)}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        maxLength={40}
        style={styles.input}
      />

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((s) => (
            <Pressable
              key={s}
              onPress={() => addLanguage(s)}
              style={({ pressed }) => [styles.suggestionRow, pressed && styles.suggestionRowPressed]}
            >
              <Text style={fzText.body}>{s}</Text>
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
  hint: {
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
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
  suggestionRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionRowPressed: {
    backgroundColor: fz.surfaceSoft,
  },
});
