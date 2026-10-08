import { ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button, Portal, TextInput } from 'react-native-paper';
import { Dialog } from '@/components/KeyboardAwareDialog';
import { getBiometricTypeName } from '@/lib/crypto/biometric-secrets';
import { fz } from '@/lib/design/tokens';
import { useTranslation } from 'react-i18next';

interface SecretsSetupProps {
  biometricStatus: any;
  initializeSecrets: any;
  initializeWithPassword: any;
  showPasswordSetupDialog: boolean;
  setShowPasswordSetupDialog: (show: boolean) => void;
  setupPassword: string;
  setSetupPassword: (pass: string) => void;
  confirmPassword: string;
  setConfirmPassword: (pass: string) => void;
  handleSetup: () => void;
  handlePasswordSetup: () => void;
}

export default function SecretsSetup({
  biometricStatus,
  initializeSecrets,
  initializeWithPassword,
  showPasswordSetupDialog,
  setShowPasswordSetupDialog,
  setupPassword,
  setSetupPassword,
  confirmPassword,
  setConfirmPassword,
  handleSetup,
  handlePasswordSetup,
}: SecretsSetupProps) {
  const { t } = useTranslation();
  const hasBiometrics = biometricStatus?.isEnrolled;

  return (
    <>
      <ScrollView contentContainerStyle={styles.centered}>
        <Text variant="headlineSmall" style={styles.title}>
          {t('secrets.secureTitle')}
        </Text>

        {hasBiometrics ? (
          <Card style={styles.infoCard}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.infoText}>
                {t('secrets.bioEncrypted')}{' '}
                <Text style={styles.bold}>
                  {getBiometricTypeName(biometricStatus.biometricType)}
                </Text>
                .
              </Text>
              <Text variant="bodySmall" style={styles.infoSubtext}>
                {t('secrets.bioBullets')}
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.infoCard}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.infoText}>
                {t('secrets.noBio')}{' '}
                <Text style={styles.bold}>{t('secrets.passwordWord')}</Text>.
              </Text>
              <Text variant="bodySmall" style={[styles.infoSubtext, styles.warningText]}>
                {t('secrets.important')}
              </Text>
            </Card.Content>
          </Card>
        )}

        {hasBiometrics ? (
          <Button
            mode="contained"
            icon="fingerprint"
            onPress={handleSetup}
            loading={initializeSecrets.isPending}
            disabled={initializeSecrets.isPending}
            style={styles.setupButton}
          >
            {initializeSecrets.isPending ? t('secrets.settingUp') : t('secrets.useBiometrics')}
          </Button>
        ) : (
          <Button
            mode="contained"
            icon="lock"
            onPress={() => setShowPasswordSetupDialog(true)}
            style={styles.setupButton}
          >
            {t('secrets.setUpPassword')}
          </Button>
        )}

        {hasBiometrics && (
          <Button
            mode="outlined"
            icon="lock"
            onPress={() => setShowPasswordSetupDialog(true)}
            style={styles.alternativeButton}
          >
            {t('secrets.usePasswordInstead')}
          </Button>
        )}
      </ScrollView>

      {/* Password Setup Dialog */}
      <Portal>
        <Dialog
          visible={showPasswordSetupDialog}
          onDismiss={() => {
            setShowPasswordSetupDialog(false);
            setSetupPassword('');
            setConfirmPassword('');
          }}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{t('secrets.setPasswordTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={[styles.warningBanner, styles.dialogFont]}>
              {t('secrets.warning')}
            </Text>
            <TextInput
              label={t('secrets.passwordMin')}
              value={setupPassword}
              onChangeText={setSetupPassword}
              mode="outlined"
              secureTextEntry
              style={[styles.input, styles.dialogFont]}
            />
            <TextInput
              label={t('secrets.confirmPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry
              style={[styles.input, styles.dialogFont]}
            />
            {setupPassword.length > 0 && setupPassword.length < 8 && (
              <Text variant="bodySmall" style={[styles.errorText, styles.dialogFont]}>
                {t('secrets.tooShort')}
              </Text>
            )}
            {confirmPassword.length > 0 && setupPassword !== confirmPassword && (
              <Text variant="bodySmall" style={[styles.errorText, styles.dialogFont]}>
                {t('secrets.mismatch')}
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              labelStyle={styles.dialogFont}
              onPress={() => {
                setShowPasswordSetupDialog(false);
                setSetupPassword('');
                setConfirmPassword('');
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              labelStyle={styles.dialogFont}
              onPress={handlePasswordSetup}
              loading={initializeWithPassword.isPending}
              disabled={
                initializeWithPassword.isPending ||
                setupPassword.length < 8 ||
                setupPassword !== confirmPassword
              }
            >
              {t('secrets.setPassword')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  infoText: {
    marginBottom: 12,
    lineHeight: 22,
  },
  infoSubtext: {
    opacity: 0.7,
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
  },
  warningText: {
    color: '#f57c00',
    fontWeight: '500',
  },
  setupButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  alternativeButton: {
    marginTop: 12,
    paddingHorizontal: 24,
  },
  warningBanner: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    color: '#e65100',
    fontWeight: '500',
    lineHeight: 20,
  },
  input: {
    marginBottom: 12,
  },
  errorText: {
    color: '#d32f2f',
    marginTop: -8,
    marginBottom: 8,
  },
});
