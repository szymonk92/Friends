import { StyleSheet, View, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, Portal, Dialog, TextInput } from 'react-native-paper';
import { useState } from 'react';
import { router } from 'expo-router';
import { useCreateContactEvent } from '@/hooks/useContactEvents';
import { useCreateContactReminder } from '@/hooks/useReminders';
import type { NewContactEvent } from '@/lib/db/schema';
import { ProfileSection } from './ProfileSection';
import { Pill } from '@/components/Pill';
import { fz, fzText } from '@/lib/design/tokens';
import { LineIcon } from '@/components/LineIcon';
import type { LineIconName } from '@/components/LineIcon';

interface PersonQuickActionsProps {
  personId: string;
  personName: string;
}

type QuickAction = {
  label: string;
  icon: LineIconName;
  eventType: NewContactEvent['eventType'];
};

const ACTIONS_ROW_1: QuickAction[] = [
  { label: 'Met', icon: 'users', eventType: 'in_person' },
  { label: 'Called', icon: 'phone', eventType: 'phone' },
  { label: 'Messaged', icon: 'message', eventType: 'message' },
];

const ACTIONS_ROW_2: QuickAction[] = [
  { label: 'Hung Out', icon: 'clock', eventType: 'in_person' },
  { label: 'Special', icon: 'star', eventType: 'social_media' },
  { label: 'Remind', icon: 'bell', eventType: 'in_person' }, // ponytail: eventType unused for the remind path
];

export default function PersonQuickActions({ personId, personName }: PersonQuickActionsProps) {
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
      Alert.alert('Error', 'Failed to log event');
    }
  };

  const handleSetReminder = () => {
    Alert.alert('Set Reminder', `Remind me to contact ${personName} in:`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: '1 Day',
        onPress: () =>
          createContactReminder
            .mutateAsync({ personId, personName, daysFromNow: 1 })
            .then(() => Alert.alert('Reminder Set', 'You will be reminded tomorrow at 10 AM')),
      },
      {
        text: '1 Week',
        onPress: () =>
          createContactReminder
            .mutateAsync({ personId, personName, daysFromNow: 7 })
            .then(() => Alert.alert('Reminder Set', 'You will be reminded in 1 week')),
      },
      {
        text: '1 Month',
        onPress: () =>
          createContactReminder
            .mutateAsync({ personId, personName, daysFromNow: 30 })
            .then(() => Alert.alert('Reminder Set', 'You will be reminded in 1 month')),
      },
    ]);
  };

  const onPress = (a: QuickAction) =>
    a.label === 'Remind' ? handleSetReminder() : openNoteDialog(a.eventType, a.label);

  return (
    <>
      <ProfileSection label="Quick Actions">
        <TouchableOpacity
          style={styles.noteButton}
          activeOpacity={0.8}
          onPress={() => router.push(`/story/addStory?personId=${personId}`)}
        >
          <LineIcon name="plus" size={16} color="#fff" />
          <Text style={styles.noteButtonText}>Add note</Text>
        </TouchableOpacity>

        <Text style={styles.subtitle}>One-tap logging for today</Text>
        <View style={styles.row}>
          {ACTIONS_ROW_1.map((a) => (
            <Pill key={a.label} label={a.label} icon={a.icon} onPress={() => onPress(a)} />
          ))}
        </View>
        <View style={styles.row}>
          {ACTIONS_ROW_2.map((a) => (
            <Pill key={a.label} label={a.label} icon={a.icon} onPress={() => onPress(a)} />
          ))}
        </View>
      </ProfileSection>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>
            {pendingEvent?.label} with {personName}
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Note (optional)"
              placeholder="What did you talk about?"
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
              Cancel
            </Button>
            <Button labelStyle={styles.dialogFont} mode="contained" onPress={handleSave}>
              Log
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
  noteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: fz.rButton,
    backgroundColor: fz.ink,
    marginBottom: 14,
  },
  noteButtonText: {
    fontFamily: fz.font,
    fontWeight: '600',
    fontSize: 15,
    color: '#fff',
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