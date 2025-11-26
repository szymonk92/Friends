import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Keyboard } from 'react-native';
import { TextInput, Text, Card, Chip, useTheme } from 'react-native-paper';
import { db, getCurrentUserId } from '@/lib/db';
import { people } from '@/lib/db/schema';
import { and, eq, or, like } from 'drizzle-orm';

interface Person {
  id: string;
  name: string;
  nickname?: string | null;
}

interface MentionTextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  numberOfLines?: number;
  style?: any;
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
  label = 'Your Story',
  numberOfLines = 12,
  style,
}: MentionTextInputProps) {
  const theme = useTheme();
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
      textBeforeCursor.substring(0, lastAtSymbol) +
      `@${person.name} ` +
      textAfterCursor;

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
      <TextInput
        mode="outlined"
        label={label}
        placeholder={placeholder || "Example: Had dinner with Sarah. She mentioned she's now vegan..."}
        value={value}
        onChangeText={handleTextChange}
        onSelectionChange={handleSelectionChange}
        multiline
        numberOfLines={numberOfLines}
        style={[styles.input, style]}
      />

      {/* @ Button below text field */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.atButton, { backgroundColor: theme.colors.primary }]}
          onPress={insertAtSymbol}
        >
          <Text style={styles.atButtonText}>@ Mention</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.atButtonOutlined, { borderColor: theme.colors.primary }]}
          onPress={insertAddPerson}
        >
          <Text style={[styles.atButtonTextOutlined, { color: theme.colors.primary }]}>@+ Add</Text>
        </TouchableOpacity>

        {/* Mention count indicator */}
        {mentions.length > 0 && (
          <Chip icon="account" compact style={styles.chip}>
            {getMentionedPeopleCount()} {getMentionedPeopleCount() === 1 ? 'person' : 'people'}
          </Chip>
        )}
      </View>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <Card style={styles.suggestionsCard}>
          <Card.Content style={styles.suggestionsContent}>
            <View style={styles.suggestionsHeader}>
              <Text variant="labelSmall" style={styles.suggestionsTitle}>
                Mention someone:
              </Text>
            </View>
            <ScrollView
              style={styles.suggestionsList}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {suggestions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectPerson(item)}
                >
                  <Text variant="bodyMedium">{item.name}</Text>
                  {item.nickname && (
                    <Text variant="bodySmall" style={styles.nickname}>
                      ({item.nickname})
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Card.Content>
        </Card>
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
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  atButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  atButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  atButtonOutlined: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  atButtonTextOutlined: {
    fontSize: 15,
    fontWeight: '600',
  },
  chip: {
    height: 32,
  },
  suggestionsCard: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    maxHeight: 200,
    elevation: 4,
    zIndex: 1000,
  },
  suggestionsContent: {
    padding: 8,
  },
  suggestionsHeader: {
    marginBottom: 4,
  },
  suggestionsTitle: {
    opacity: 0.6,
    fontWeight: '600',
  },
  suggestionsList: {
    maxHeight: 150,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
    backgroundColor: '#f5f5f5',
  },
  nickname: {
    opacity: 0.6,
    marginTop: 2,
  },
});
