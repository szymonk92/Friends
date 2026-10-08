import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text } from 'react-native';
import { FormInput } from '@/components/FormKit';
import { Pill } from '@/components/Pill';
import { db, getCurrentUserId } from '@/lib/db';
import { people } from '@/lib/db/schema';
import { and, eq, or, like } from 'drizzle-orm';
import { fz, fzText } from '@/lib/design/tokens';
import { useTranslation } from 'react-i18next';

interface Person {
  id: string;
  name: string;
  nickname?: string | null;
}

interface MentionTextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  numberOfLines?: number;
  style?: any;
  // Soft filled block instead of an outlined box — one quiet layer on the page.
  filled?: boolean;
}

interface Mention {
  personId: string;
  personName: string;
  startIndex: number;
  endIndex: number;
}

export default function MentionTextInput({
  value,
  onChangeText,
  placeholder,
  numberOfLines = 12,
  style,
  filled = false,
}: MentionTextInputProps) {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState<Person[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentMentionQuery, setCurrentMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentions, setMentions] = useState<Mention[]>([]);

  // Extract mentions from text (@name format)
  const extractMentions = (text: string): Mention[] => {
    const mentionRegex = /@(\w+)/g;
    const foundMentions: Mention[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      foundMentions.push({
        personId: '', // Will be resolved when matching
        personName: match[1],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    return foundMentions;
  };

  // Detect if cursor is in a mention context
  useEffect(() => {
    const checkForMention = () => {
      const textBeforeCursor = value.substring(0, cursorPosition);
      const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

      if (lastAtSymbol === -1) {
        setShowSuggestions(false);
        return;
      }

      // Check if it's @+ syntax (for adding new people - no autocomplete needed)
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      if (textAfterAt.startsWith('+')) {
        setShowSuggestions(false);
        return;
      }

      // Check if there's a space after the @ symbol
      if (textAfterAt.includes(' ')) {
        setShowSuggestions(false);
        return;
      }

      // We're in a mention context
      setCurrentMentionQuery(textAfterAt);
      setShowSuggestions(true);
      searchPeople(textAfterAt);
    };

    checkForMention();
  }, [value, cursorPosition]);

  // Update mentions list when text changes
  useEffect(() => {
    const detectedMentions = extractMentions(value);
    setMentions(detectedMentions);
  }, [value]);

  // Search for people matching the query
  const searchPeople = async (query: string) => {
    try {
      const userId = await getCurrentUserId();
      const searchPattern = `%${query}%`;

      const results = await db
        .select({
          id: people.id,
          name: people.name,
          nickname: people.nickname,
        })
        .from(people)
        .where(
          and(
            eq(people.userId, userId),
            or(like(people.name, searchPattern), like(people.nickname, searchPattern))
          )
        )
        .limit(5);

      setSuggestions(results);
    } catch (error) {
      console.error('Error searching people:', error);
      setSuggestions([]);
    }
  };

  // Handle selecting a person from suggestions
  const handleSelectPerson = (person: Person) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    // Replace @query with @PersonName
    const newText =
      textBeforeCursor.substring(0, lastAtSymbol) + `@${person.name} ` + textAfterCursor;

    onChangeText(newText);
    setShowSuggestions(false);
    setSuggestions([]);

    // Move cursor after the mention
    setCursorPosition(lastAtSymbol + person.name.length + 2);
  };

  // Handle text change
  const handleTextChange = (text: string) => {
    onChangeText(text);
  };

  // Handle selection change (cursor position)
  const handleSelectionChange = (event: any) => {
    setCursorPosition(event.nativeEvent.selection.start);
  };

  // Get mentioned people count
  const getMentionedPeopleCount = () => {
    const uniqueNames = new Set(mentions.map((m) => m.personName));
    return uniqueNames.size;
  };

  // Insert @ symbol at cursor position
  const insertAtSymbol = () => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const newText = textBeforeCursor + '@' + textAfterCursor;
    onChangeText(newText);
    setCursorPosition(cursorPosition + 1);
  };

  const insertAddPerson = () => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const newText = textBeforeCursor + '@+' + textAfterCursor;
    onChangeText(newText);
    setCursorPosition(cursorPosition + 1);
  };

  return (
    <View style={styles.container}>
      <FormInput
        placeholder={placeholder || t('mention.placeholder')}
        value={value}
        onChangeText={handleTextChange}
        onSelectionChange={handleSelectionChange}
        multiline
        numberOfLines={numberOfLines}
        style={[styles.input, filled && styles.inputFilled, style]}
        {...(filled && {
          outlineColor: 'transparent',
          activeOutlineColor: fz.outline,
        })}
      />

      <View style={styles.bottomActions}>
        <Pill label={t('mention.mention')} variant="solid" onPress={insertAtSymbol} />
        <Pill label={t('mention.add')} variant="outline" onPress={insertAddPerson} />
        {mentions.length > 0 && (
          <Pill label={t('mention.people', { count: getMentionedPeopleCount() })} variant="soft" />
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsCard}>
          <Text style={[fzText.label, styles.suggestionsTitle]}>{t('mention.someone')}</Text>
          <ScrollView
            style={styles.suggestionsList}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {suggestions.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.suggestionItem, pressed && styles.suggestionPressed]}
                onPress={() => handleSelectPerson(item)}
              >
                <Text style={fzText.name}>{item.name}</Text>
                {item.nickname && <Text style={fzText.sub}>{item.nickname}</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  input: {
    minHeight: 200,
    marginBottom: 0,
  },
  inputFilled: {
    backgroundColor: fz.surfaceSoft,
  },
  bottomActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: fz.s.md,
    gap: fz.s.sm,
  },
  suggestionsCard: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    maxHeight: 220,
    zIndex: 1000,
    elevation: 4,
    padding: fz.s.md,
    backgroundColor: fz.card,
    borderWidth: 1,
    borderColor: fz.cardBorder,
    borderRadius: fz.rCard,
  },
  suggestionsTitle: {
    marginBottom: fz.s.sm,
  },
  suggestionsList: {
    maxHeight: 160,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: fz.s.sm,
    paddingVertical: 10,
    paddingHorizontal: fz.s.md,
    borderRadius: fz.rRow,
  },
  suggestionPressed: {
    backgroundColor: fz.surfaceSoft,
  },
});
