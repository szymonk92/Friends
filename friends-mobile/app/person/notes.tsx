import { ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { usePerson } from '@/hooks/usePeople';
import { parseNotes } from '@/lib/people/notes';
import { fz } from '@/lib/design/tokens';
import { IconCircle } from '@/components/IconCircle';
import { NoteScreenShell } from '@/components/person/NoteScreenShell';
import { NoteCard, openNewNote, useNoteActions } from '@/components/person/NoteCards';
import type { Person } from '@/lib/db/schema';

function List({ person }: { person: Person }) {
  const { open, press, sheet } = useNoteActions(person);
  return (
    <ScrollView contentContainerStyle={styles.inner}>
      {parseNotes(person.notes)
        .reverse()
        .map((e) => (
          <NoteCard key={e.index} entry={e} onPress={() => open(e)} onLongPress={() => press(e)} />
        ))}
      {sheet}
    </ScrollView>
  );
}

export default function NotesScreen() {
  const { t } = useTranslation();
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { data: person } = usePerson(personId!);
  return (
    <NoteScreenShell
      title={t('person.notes')}
      right={<IconCircle icon="plus" size={34} iconSize={16} onPress={() => openNewNote(personId!)} />}
    >
      {person && <List person={person} />}
    </NoteScreenShell>
  );
}

const styles = StyleSheet.create({
  inner: { padding: fz.s.edge, paddingTop: fz.s.sm },
});
