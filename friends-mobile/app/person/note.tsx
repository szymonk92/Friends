import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePerson, useUpdatePerson } from '@/hooks/usePeople';
import { appendNote, entryText, parseNotes, replaceNote } from '@/lib/people/notes';
import { formatShortDate } from '@/lib/utils/format';
import { fz, fzText } from '@/lib/design/tokens';
import { NoteScreenShell } from '@/components/person/NoteScreenShell';

/** One note, full screen: read mode for existing notes, editor for new ones (or `edit=1`). */
export default function NoteScreen() {
  const { t } = useTranslation();
  const { personId, index, edit } = useLocalSearchParams<{
    personId: string;
    index: string;
    edit?: string;
  }>();
  const { data: person } = usePerson(personId!);
  const updatePerson = useUpdatePerson();

  const isNew = index === 'new';
  const entry = parseNotes(person?.notes).find((e) => e.index === Number(index));
  const [editing, setEditing] = useState(isNew || edit === '1');
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? entry?.body ?? '';

  const save = async () => {
    const notes = isNew
      ? appendNote(person!.notes, text, formatShortDate(new Date()))
      : replaceNote(person!.notes, Number(index), entryText(entry!.date, text));
    try {
      await updatePerson.mutateAsync({ id: personId!, notes });
      router.back();
    } catch {
      Alert.alert(t('common.error'), t('person.notesSaveError'));
    }
  };

  const loaded = !!person && (isNew || !!entry);
  return (
    <NoteScreenShell
      title={isNew ? t('person.addNote') : (entry?.date ?? t('person.notes'))}
      right={
        loaded && (
          <Pressable
            accessibilityRole="button"
            disabled={updatePerson.isPending || (editing && !text.trim())}
            onPress={editing ? save : () => setEditing(true)}
            style={[styles.btn, editing && !text.trim() && { opacity: 0.4 }]}
          >
            <Text style={fzText.btn}>{editing ? t('common.save') : t('common.edit')}</Text>
          </Pressable>
        )
      }
    >
      {loaded &&
        (editing ? (
          <TextInput
            value={text}
            onChangeText={setDraft}
            placeholder={t('person.notePlaceholder')}
            placeholderTextColor={fz.textDim}
            multiline
            autoFocus
            style={styles.input}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.read}>
            <Text style={[fzText.body, styles.readText]} selectable>
              {entry!.body}
            </Text>
          </ScrollView>
        ))}
    </NoteScreenShell>
  );
}

const styles = StyleSheet.create({
  // Compact pill: 6px vertical padding, not the roomy dialog button.
  btn: {
    backgroundColor: fz.ink,
    borderRadius: fz.rButton,
    paddingVertical: 6,
    paddingHorizontal: 18,
  },
  input: {
    flex: 1,
    padding: fz.s.edge,
    paddingTop: fz.s.sm,
    textAlignVertical: 'top',
    fontFamily: fz.font,
    fontSize: 16,
    lineHeight: 24,
    color: fz.ink,
  },
  read: { padding: fz.s.edge, paddingTop: fz.s.sm },
  readText: { fontSize: 16, lineHeight: 24 },
});
