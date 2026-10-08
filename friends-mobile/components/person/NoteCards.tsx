import { Pressable, StyleSheet, View } from 'react-native';
import { Modal, Portal, Text } from 'react-native-paper';
import { useState, type ReactElement } from 'react';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useUpdatePerson } from '@/hooks/usePeople';
import { replaceNote, type NoteEntry } from '@/lib/people/notes';
import { confirmDestructive } from '@/lib/utils/confirm';
import { fz, fzText } from '@/lib/design/tokens';
import type { Person } from '@/lib/db/schema';

const noteRoute = (personId: string, index: number | 'new', edit?: boolean) =>
  `/person/note?personId=${personId}&index=${index}${edit ? '&edit=1' : ''}` as Href; // ponytail: cast until typed routes regenerate

export const openNewNote = (personId: string) => router.push(noteRoute(personId, 'new'));

/**
 * Tap a note → full-screen view; long-press → bottom sheet with Edit / Delete.
 * Render `{sheet}` once next to the cards.
 */
export function useNoteActions(person: Person): {
  open: (e: NoteEntry) => void;
  press: (e: NoteEntry) => void;
  sheet: ReactElement;
} {
  const { t } = useTranslation();
  const updatePerson = useUpdatePerson();
  const [target, setTarget] = useState<NoteEntry | null>(null);
  const close = () => setTarget(null);

  const remove = (e: NoteEntry) =>
    confirmDestructive({
      title: t('person.deleteNote'),
      message: t('person.deleteNoteConfirm'),
      onConfirm: () =>
        updatePerson.mutateAsync({ id: person.id, notes: replaceNote(person.notes, e.index, null) }),
    });

  const sheet = (
    <Portal>
      <Modal visible={!!target} onDismiss={close} contentContainerStyle={styles.sheetWrap}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <SheetAction
            label={t('common.edit')}
            onPress={() => {
              const e = target!;
              close();
              router.push(noteRoute(person.id, e.index, true));
            }}
          />
          <SheetAction
            label={t('common.delete')}
            destructive
            onPress={() => {
              const e = target!;
              close();
              remove(e);
            }}
          />
        </View>
      </Modal>
    </Portal>
  );

  return {
    open: (e) => router.push(noteRoute(person.id, e.index)),
    press: setTarget,
    sheet,
  };
}

function SheetAction({
  label,
  destructive,
  onPress,
}: {
  label: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
      onPress={onPress}
    >
      <Text style={[fzText.name, destructive && { color: '#D32F2F' }]}>{label}</Text>
    </Pressable>
  );
}

export function NoteCard({
  entry,
  onPress,
  onLongPress,
}: {
  entry: NoteEntry;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
    >
      <Text style={fzText.body} numberOfLines={3}>
        {entry.date ? `${entry.date} — ${entry.body}` : entry.body}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    // Flat entry like the original notes list: plain text between hairlines.
    paddingVertical: fz.s.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: fz.outline,
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: fz.card,
    borderTopLeftRadius: fz.rCard + 6,
    borderTopRightRadius: fz.rCard + 6,
    paddingHorizontal: fz.s.edge,
    paddingBottom: fz.s.xxl,
    paddingTop: fz.s.sm,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: fz.outline,
    marginBottom: fz.s.sm,
  },
  action: { paddingVertical: 16 },
});
