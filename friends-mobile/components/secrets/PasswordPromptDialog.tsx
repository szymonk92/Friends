import { StyleSheet } from 'react-native';
import { Dialog, Text, TextInput, Button } from 'react-native-paper';
import { fz } from '@/lib/design/tokens';

interface PasswordPromptDialogProps {
  visible: boolean;
  onDismiss: () => void;
  accessPassword: string;
  setAccessPassword: (pass: string) => void;
  pendingAction: 'create' | 'view' | null;
  handlePasswordSubmit: () => void;
  loading: boolean;
}

export default function PasswordPromptDialog({
  visible,
  onDismiss,
  accessPassword,
  setAccessPassword,
  pendingAction,
  handlePasswordSubmit,
  loading,
}: PasswordPromptDialogProps) {
  return (
    <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
      <Dialog.Title style={styles.dialogTitle}>Enter Password</Dialog.Title>
      <Dialog.Content>
        <Text variant="bodySmall" style={[styles.passwordPromptText, styles.dialogFont]}>
          Enter your password to {pendingAction === 'create' ? 'save' : 'decrypt'} the secret
        </Text>
        <TextInput
          label="Password"
          value={accessPassword}
          onChangeText={setAccessPassword}
          mode="outlined"
          secureTextEntry
          style={[styles.input, styles.dialogFont]}
          autoFocus
        />
      </Dialog.Content>
      <Dialog.Actions>
        <Button labelStyle={styles.dialogFont} onPress={onDismiss}>
          Cancel
        </Button>
        <Button
          labelStyle={styles.dialogFont}
          onPress={handlePasswordSubmit}
          loading={loading}
          disabled={!accessPassword || loading}
        >
          Submit
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
  passwordPromptText: {
    marginBottom: 16,
    opacity: 0.7,
  },
  input: {
    marginBottom: 12,
  },
});
