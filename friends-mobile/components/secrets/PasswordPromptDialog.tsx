import { StyleSheet } from 'react-native';
import { Dialog, Text, TextInput, Button } from 'react-native-paper';

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
    <Dialog visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>Enter Password</Dialog.Title>
      <Dialog.Content>
        <Text variant="bodySmall" style={styles.passwordPromptText}>
          Enter your password to {pendingAction === 'create' ? 'save' : 'decrypt'} the secret
        </Text>
        <TextInput
          label="Password"
          value={accessPassword}
          onChangeText={setAccessPassword}
          mode="outlined"
          secureTextEntry
          style={styles.input}
          autoFocus
        />
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>Cancel</Button>
        <Button
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
  passwordPromptText: {
    marginBottom: 16,
    opacity: 0.7,
  },
  input: {
    marginBottom: 12,
  },
});
