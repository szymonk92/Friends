import { ScrollView, StyleSheet } from 'react-native';
import { Text, Button, Portal, TextInput } from 'react-native-paper';
import { Dialog } from '@/components/KeyboardAwareDialog';
import { getBiometricTypeName } from '@/lib/crypto/biometric-secrets';
import { fz, fzText } from '@/lib/design/tokens';
import { FormSection } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
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
        <Text style={[fzText.titleLg, styles.title]}>{t('secrets.secureTitle')}</Text>

        <FormSection style={styles.infoCard}>
          {hasBiometrics ? (
            <>
              <Text style={fzText.body}>
                {t('secrets.bioEncrypted')}{' '}
                <Text style={styles.bold}>{getBiometricTypeName(biometricStatus.biometricType)}</Text>.
              </Text>
              <Text style={[fzText.sub, styles.infoSubtext]}>{t('secrets.bioBullets')}</Text>
            </>
          ) : (
            <>
              <Text style={fzText.body}>
                {t('secrets.noBio')} <Text style={styles.bold}>{t('secrets.passwordWord')}</Text>.
              </Text>
              <Text style={[fzText.sub, styles.infoSubtext, { color: fz.warn }]}>{t('secrets.important')}</Text>
            </>
          )}
        </FormSection>

        {hasBiometrics ? (
          <PrimaryButton
            label={initializeSecrets.isPending ? t('secrets.settingUp') : t('secrets.useBiometrics')}
            onPress={handleSetup}
            disabled={initializeSecrets.isPending}
            style={styles.setupButton}
          />
        ) : (
          <PrimaryButton
            label={t('secrets.setUpPassword')}
            onPress={() => setShowPasswordSetupDialog(true)}
            style={styles.setupButton}
          />
        )}

        {hasBiometrics && (
          <PrimaryButton
            variant="outline"
            label={t('secrets.usePasswordInstead')}
            onPress={() => setShowPasswordSetupDialog(true)}
            style={styles.alternativeButton}
          />
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
            <Text variant="bodySmall" style={styles.warningBanner}>
              {t('secrets.warning')}
            </Text>
            <TextInput
              label={t('secrets.passwordMin')}
              value={setupPassword}
              onChangeText={setSetupPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
            />
            <TextInput
              label={t('secrets.confirmPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
            />
            {setupPassword.length > 0 && setupPassword.length < 8 && (
              <Text variant="bodySmall" style={styles.errorText}>
                {t('secrets.tooShort')}
              </Text>
            )}
            {confirmPassword.length > 0 && setupPassword !== confirmPassword && (
              <Text variant="bodySmall" style={styles.errorText}>
                {t('secrets.mismatch')}
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setShowPasswordSetupDialog(false);
                setSetupPassword('');
                setConfirmPassword('');
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
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
    alignSelf: 'stretch',
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
    color: fz.warn,
    fontWeight: '500',
  },
  setupButton: {
    alignSelf: 'stretch',
  },
  alternativeButton: {
    alignSelf: 'stretch',
    marginTop: 12,
  },
  warningBanner: {
    backgroundColor: fz.warnBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    color: fz.warn,
    fontWeight: '500',
    lineHeight: 20,
  },
  input: {
    marginBottom: 12,
  },
  errorText: {
    color: fz.danger,
    marginTop: -8,
    marginBottom: 8,
  },
});
