import { StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { router, type Href } from 'expo-router';
import { parseNotes } from '@/lib/people/notes';
import type { Person } from '@/lib/db/schema';
import { fzText } from '@/lib/design/tokens';
import { ProfileSection } from './ProfileSection';
import { NoteCard, openNewNote, useNoteActions } from './NoteCards';

const LATEST = 3;

/**
 * The person's notes: latest few as cards (newest first). Tap opens the note,
 * long-press offers Edit / Delete, `+` opens the full-screen editor. Backed by
 * `people.notes`, so the edit form, search and exports see the same text.
 */
export default function PersonNotes({ person }: { person: Person }) {
  const { t } = useTranslation();
  const { open, press, sheet } = useNoteActions(person);
  const entries = parseNotes(person.notes).reverse();

  return (
    <ProfileSection
      label={t('person.notes')}
      count={entries.length || null}
      onAdd={() => openNewNote(person.id)}
    >
      {entries.length === 0 && <Text style={styles.empty}>{t('person.notesEmpty')}</Text>}
      {entries.slice(0, LATEST).map((e) => (
        <NoteCard key={e.index} entry={e} onPress={() => open(e)} onLongPress={() => press(e)} />
      ))}
      {entries.length > LATEST && (
        <Pressable onPress={() => router.push(`/person/notes?personId=${person.id}` as Href)}>
          <Text style={styles.all}>{t('person.allNotes', { count: entries.length })}</Text>
        </Pressable>
      )}
      {sheet}
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  empty: { ...fzText.sub, fontStyle: 'italic' },
  all: { ...fzText.btnOutline, paddingVertical: 8 },
});
