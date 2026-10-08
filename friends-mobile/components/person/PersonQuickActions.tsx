import { StyleSheet, View, Alert } from 'react-native';
import { Text, Button, Portal, TextInput } from 'react-native-paper';
import { Dialog } from '@/components/KeyboardAwareDialog';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useCreateContactEvent } from '@/hooks/useContactEvents';
import { useCreateContactReminder } from '@/hooks/useReminders';
import type { NewContactEvent } from '@/lib/db/schema';
import { ProfileSection } from './ProfileSection';
import { Pill } from '@/components/Pill';
import { fz, fzText } from '@/lib/design/tokens';
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
  const [pendingEvent, setPendingEvent] = useState<{ type: NewContactEvent['eventType']; label: string } | null>(null);
  const [noteText, setNoteText] = useState('');

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

  const handleSetReminder = () => {
    Alert.alert(t('profile.reminderTitle'), t('profile.reminderPrompt', { name: personName }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.day1'),
        onPress: () =>
          createContactReminder
            .mutateAsync({ personId, personName, daysFromNow: 1 })
            .then(() => Alert.alert(t('profile.reminderSet'), t('profile.remindTomorrow'))),
      },
      {
        text: t('profile.week1'),
        onPress: () =>
          createContactReminder
            .mutateAsync({ personId, personName, daysFromNow: 7 })
            .then(() => Alert.alert(t('profile.reminderSet'), t('profile.remindWeek'))),
      },
      {
        text: t('profile.month1'),
        onPress: () =>
          createContactReminder
            .mutateAsync({ personId, personName, daysFromNow: 30 })
            .then(() => Alert.alert(t('profile.reminderSet'), t('profile.remindMonth'))),
      },
    ]);
  };

  const onPress = (a: QuickAction) =>
    a.labelKey === 'remind'
      ? handleSetReminder()
      : openNoteDialog(a.eventType, t(`profile.${a.labelKey}`));

  return (
    <>
      <ProfileSection
        label={t('profile.quickTitle')}
        collapsible
        storageKey="quickActions"
        onAdd={() => router.push(`/story/addStory?personId=${personId}`)}
      >
        <Text style={styles.subtitle}>{t('profile.quickSubtitle')}</Text>
        <View style={styles.row}>
          {ACTIONS_ROW_1.map((a) => (
            <Pill key={a.labelKey} label={t(`profile.${a.labelKey}`)} icon={a.icon} onPress={() => onPress(a)} />
          ))}
        </View>
        <View style={styles.row}>
          {ACTIONS_ROW_2.map((a) => (
            <Pill key={a.labelKey} label={t(`profile.${a.labelKey}`)} icon={a.icon} onPress={() => onPress(a)} />
          ))}
        </View>
      </ProfileSection>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={styles.dialog}>
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
  subtitle: {
    ...fzText.sub,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
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