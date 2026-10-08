import { StyleSheet, View, Alert } from 'react-native';
import { Text, Button, Portal, TextInput } from 'react-native-paper';
import { Dialog } from '@/components/KeyboardAwareDialog';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useCreateContactEvent } from '@/hooks/useContactEvents';
import { useCreateContactReminder } from '@/hooks/useReminders';
import type { NewContactEvent } from '@/lib/db/schema';
import { ProfileSection, chipRow } from './ProfileSection';
import { Pill } from '@/components/Pill';
import { ActionSheet } from '@/components/ActionSheet';
import { fz } from '@/lib/design/tokens';
import type { LineIconName } from '@/components/LineIcon';

interface PersonQuickActionsProps {
  personId: string;
  personName: string;
}

type QuickAction = {
  labelKey: 'met' | 'called' | 'messaged' | 'hungOut' | 'special' | 'remind';
  icon: LineIconName;
  eventType: NewContactEvent['eventType'];
};

const ACTIONS_ROW_1: QuickAction[] = [
  { labelKey: 'met', icon: 'users', eventType: 'in_person' },
  { labelKey: 'called', icon: 'phone', eventType: 'phone' },
  { labelKey: 'messaged', icon: 'message', eventType: 'message' },
];

const ACTIONS_ROW_2: QuickAction[] = [
  { labelKey: 'hungOut', icon: 'clock', eventType: 'in_person' },
  { labelKey: 'special', icon: 'star', eventType: 'social_media' },
  { labelKey: 'remind', icon: 'bell', eventType: 'in_person' }, // ponytail: eventType unused for the remind path
];

export default function PersonQuickActions({ personId, personName }: PersonQuickActionsProps) {
  const { t } = useTranslation();
  const createContactEvent = useCreateContactEvent();
  const createContactReminder = useCreateContactReminder();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<{
    type: NewContactEvent['eventType'];
    label: string;
  } | null>(null);
  const [noteText, setNoteText] = useState('');
  const [reminderSheetVisible, setReminderSheetVisible] = useState(false);

  const openNoteDialog = (eventType: NewContactEvent['eventType'], label: string) => {
    setPendingEvent({ type: eventType, label });
    setNoteText('');
    setDialogVisible(true);
  };

  const handleSave = async () => {
    if (!pendingEvent) return;
    setDialogVisible(false);
    try {
      await createContactEvent.mutateAsync({
        personId,
        eventType: pendingEvent.type,
        eventDate: new Date(),
        notes: noteText.trim() || null,
      });
    } catch {
      Alert.alert(t('common.error'), t('profile.logFailed'));
    }
  };

  const remindIn = (daysFromNow: number) => () =>
    createContactReminder
      .mutateAsync({ personId, personName, daysFromNow })
      .catch(() => Alert.alert(t('common.error'), t('profile.reminderFailed')));

  const onPress = (a: QuickAction) =>
    a.labelKey === 'remind'
      ? setReminderSheetVisible(true)
      : openNoteDialog(a.eventType, t(`profile.${a.labelKey}`));

  return (
    <>
      <ProfileSection
        label={t('profile.quickTitle')}
        subtitle={t('profile.quickSubtitle')}
        collapsible
        storageKey="quickActions"
        onAdd={() => router.push(`/story/addStory?personId=${personId}`)}
      >
        <View style={styles.rows}>
          <View style={chipRow}>
            {ACTIONS_ROW_1.map((a) => (
              <Pill
                key={a.labelKey}
                label={t(`profile.${a.labelKey}`)}
                icon={a.icon}
                onPress={() => onPress(a)}
              />
            ))}
          </View>
          <View style={chipRow}>
            {ACTIONS_ROW_2.map((a) => (
              <Pill
                key={a.labelKey}
                label={t(`profile.${a.labelKey}`)}
                icon={a.icon}
                onPress={() => onPress(a)}
              />
            ))}
          </View>
        </View>
      </ProfileSection>

      <ActionSheet
        visible={reminderSheetVisible}
        title={t('profile.reminderPrompt', { name: personName })}
        onDismiss={() => setReminderSheetVisible(false)}
        actions={[
          { label: t('profile.day1'), icon: 'bell', onPress: remindIn(1) },
          { label: t('profile.week1'), icon: 'bell', onPress: remindIn(7) },
          { label: t('profile.month1'), icon: 'bell', onPress: remindIn(30) },
        ]}
      />

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            {t('profile.withPerson', { action: pendingEvent?.label, name: personName })}
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label={t('profile.noteOptional')}
              placeholder={t('profile.notePlaceholder')}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={3}
              autoFocus
              style={styles.dialogFont}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button labelStyle={styles.dialogFont} onPress={() => setDialogVisible(false)}>
              {t('common.cancel')}
            </Button>
            <Button labelStyle={styles.dialogFont} mode="contained" onPress={handleSave}>
              {t('profile.log')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  rows: { gap: fz.s.xs },
  dialog: {
    borderRadius: fz.rCard,
    backgroundColor: fz.card,
  },
  dialogTitle: {
    fontFamily: fz.font,
  },
  dialogFont: {
    fontFamily: fz.font,
  },
});
