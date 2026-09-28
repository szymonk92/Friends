import { StyleSheet } from 'react-native';
import { Dialog, Text, Button } from 'react-native-paper';
import { fz } from '@/lib/design/tokens';

interface ViewSecretDialogProps {
  visible: boolean;
  onDismiss: () => void;
  viewedSecret: { title: string; content: string } | null;
  remainingTime: number;
}

export default function ViewSecretDialog({
  visible,
  onDismiss,
  viewedSecret,
  remainingTime,
}: ViewSecretDialogProps) {
  return (
    <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
      <Dialog.Title style={styles.dialogTitle}>{viewedSecret?.title || 'Secret'}</Dialog.Title>
      <Dialog.Content>
        <Text variant="bodySmall" style={[styles.securityTimer, styles.dialogFont]}>
          Auto-closing in {remainingTime}s for security
        </Text>
        <Text variant="bodyMedium" style={styles.secretContent}>
          {viewedSecret?.content}
        </Text>
      </Dialog.Content>
      <Dialog.Actions>
        <Button labelStyle={styles.dialogFont} onPress={onDismiss}>
          Close
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}

const styles = StyleSheet.create({
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
  securityTimer: {
    color: '#ff5722',
    marginBottom: 12,
  },
  secretContent: {
    backgroundColor: fz.surfaceSoft,
    padding: 12,
    borderRadius: 8,
    fontFamily: 'monospace',
  },
});
