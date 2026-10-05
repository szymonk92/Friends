import { StyleSheet, Alert } from 'react-native';
import { Text, Button, Portal, TextInput } from 'react-native-paper';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/KeyboardAwareDialog';
import { IconCircle } from '@/components/IconCircle';
import { useUpdatePerson } from '@/hooks/usePeople';
import { appendNote } from '@/lib/people/notes';
import { formatShortDate } from '@/lib/utils/format';
import type { Person } from '@/lib/db/schema';
import { fz, fzText } from '@/lib/design/tokens';
import { ProfileSection } from './ProfileSection';

const PREVIEW_CHARS = 220;

type DialogMode = 'add' | 'edit';

/**
 * The person's notes, right on the profile: `+` appends a dated note, the
 * pencil edits the whole text. Backed by `people.notes`, so the edit form,
 * search and exports all see the same notes.
 */
export default function PersonNotes({ person }: { person: Person }) {
  const { t } = useTranslation();
  const updatePerson = useUpdatePerson();
  // Mode outlives `dialogVisible` so the title doesn't flip during the close animation.
  const [mode, setMode] = useState<DialogMode>('add');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState(false);

  const notes = person.notes?.trim() ?? '';
  const overflow = notes.length > PREVIEW_CHARS;
  const visible = !overflow || expanded ? notes : `${notes.slice(0, PREVIEW_CHARS).trimEnd()}…`;

  const open = (next: DialogMode) => {
    setDraft(next === 'edit' ? notes : '');
    setMode(next);
    setDialogVisible(true);
  };
  const close = () => setDialogVisible(false);

  const save = async () => {
    const value =
      mode === 'add' ? appendNote(notes, draft, formatShortDate(new Date())) : draft.trim() || null;
    try {
      await updatePerson.mutateAsync({ id: person.id, notes: value });
      // New notes land at the end; make sure the one just added is on screen.
      if (mode === 'add') setExpanded(true);
      close();
    } catch {
      Alert.alert(t('common.error'), t('person.notesSaveError'));
    }
  };

  return (
    <>
      <ProfileSection
        label={t('person.notes')}
        onAdd={() => open('add')}
        actions={
          notes ? (
            <IconCircle icon="pencil" size={30} iconSize={15} onPress={() => open('edit')} />
          ) : undefined
        }
      >
        {notes ? (
          <>
            <Text style={fzText.body}>{visible}</Text>
            {overflow && (
              <Text style={styles.toggle} onPress={() => setExpanded((v) => !v)}>
                {expanded ? t('person.showLess') : t('person.showMore')}
              </Text>
            )}
          </>
        ) : (
          <Text style={styles.empty}>{t('person.notesEmpty')}</Text>
        )}
      </ProfileSection>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={close} style={styles.dialog}>
          <Dialog.Title style={styles.font}>
            {mode === 'edit' ? t('person.editNotes') : t('person.addNote')}
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              value={draft}
              onChangeText={setDraft}
              placeholder={t('person.notePlaceholder')}
              multiline
              autoFocus
              style={styles.input}
              contentStyle={styles.inputContent}
              outlineColor={fz.outline}
              activeOutlineColor={fz.ink}
              outlineStyle={styles.inputOutline}
            />
          </Dialog.Content>
          <Dialog.Actions style={styles.actions}>
            <Button labelStyle={styles.font} textColor={fz.ink} onPress={close}>
              {t('common.cancel')}
            </Button>
            <Button
              labelStyle={styles.font}
              mode="contained"
              buttonColor={fz.ink}
              textColor="#FFFFFF"
              style={styles.save}
              contentStyle={styles.saveContent}
              onPress={save}
              loading={updatePerson.isPending}
              disabled={updatePerson.isPending || (mode === 'add' && !draft.trim())}
            >
              {t('common.save')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  toggle: {
    marginTop: 6,
    fontWeight: '600',
    fontFamily: fz.font,
    fontSize: 13,
    color: fz.ink,
  },
  empty: {
    ...fzText.sub,
    fontStyle: 'italic',
  },
  dialog: {
    borderRadius: fz.rCard,
    backgroundColor: fz.card,
  },
  font: {
    fontFamily: fz.font,
  },
  input: {
    fontFamily: fz.font,
    backgroundColor: fz.card,
  },
  inputOutline: { borderRadius: fz.rRow },
  // Grows with the text, then scrolls, so long notes never push Save off screen.
  // Explicit padding: Paper's multiline default hugs the top-left corner.
  inputContent: {
    minHeight: 110,
    maxHeight: 220,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 16,
    textAlignVertical: 'top',
  },
  actions: { paddingHorizontal: fz.s.xl, paddingBottom: fz.s.xl, gap: fz.s.sm },
  save: { borderRadius: fz.rButton },
  saveContent: { paddingHorizontal: 22, paddingVertical: 6 },
});
