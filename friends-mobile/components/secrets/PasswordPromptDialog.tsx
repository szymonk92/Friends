import { StyleSheet } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { Dialog } from '@/components/KeyboardAwareDialog';
import { fz } from '@/lib/design/tokens';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  return (
    <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
      <Dialog.Title style={styles.dialogTitle}>{t('secrets.enterPassword')}</Dialog.Title>
      <Dialog.Content>
        <Text variant="bodySmall" style={[styles.passwordPromptText, styles.dialogFont]}>
          {pendingAction === 'create' ? t('secrets.promptSave') : t('secrets.promptDecrypt')}
        </Text>
        <TextInput
          label={t('secrets.password')}
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
          {t('common.cancel')}
        </Button>
        <Button
          labelStyle={styles.dialogFont}
          onPress={handlePasswordSubmit}
          loading={loading}
          disabled={!accessPassword || loading}
        >
          {t('secrets.submit')}
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
