import { ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button, Portal, Dialog, TextInput } from 'react-native-paper';
import { getBiometricTypeName } from '@/lib/crypto/biometric-secrets';

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
  const hasBiometrics = biometricStatus?.isEnrolled;

  return (
    <>
      <ScrollView contentContainerStyle={styles.centered}>
        <Text variant="headlineSmall" style={styles.title}>
          Secure Your Secrets
        </Text>

        {hasBiometrics ? (
          <Card style={styles.infoCard}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.infoText}>
                Your secrets will be encrypted and protected by{' '}
                <Text style={styles.bold}>
                  {getBiometricTypeName(biometricStatus.biometricType)}
                </Text>
                .
              </Text>
              <Text variant="bodySmall" style={styles.infoSubtext}>
                • Only you can access them with your biometrics{'\n'}• Data is encrypted on your
                device{'\n'}• No one else can read your secrets
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.infoCard}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.infoText}>
                Your device doesn't have biometrics enrolled. You can protect your secrets with a{' '}
                <Text style={styles.bold}>password</Text>.
              </Text>
              <Text variant="bodySmall" style={[styles.infoSubtext, styles.warningText]}>
                ⚠️ IMPORTANT: If you forget your password, your secrets CANNOT be recovered. There
                is NO password reset option.
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
            {initializeSecrets.isPending ? 'Setting up...' : 'Use Biometrics'}
          </Button>
        ) : (
          <Button
            mode="contained"
            icon="lock"
            onPress={() => setShowPasswordSetupDialog(true)}
            style={styles.setupButton}
          >
            Set Up Password
          </Button>
        )}

        {hasBiometrics && (
          <Button
            mode="outlined"
            icon="lock"
            onPress={() => setShowPasswordSetupDialog(true)}
            style={styles.alternativeButton}
          >
            Use Password Instead
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
        >
          <Dialog.Title>Set Password</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={styles.warningBanner}>
              ⚠️ WARNING: If you forget this password, your secrets CANNOT be recovered. Write it
              down in a safe place!
            </Text>
            <TextInput
              label="Password (min 8 characters)"
              value={setupPassword}
              onChangeText={setSetupPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
            />
            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
            />
            {setupPassword.length > 0 && setupPassword.length < 8 && (
              <Text variant="bodySmall" style={styles.errorText}>
                Password must be at least 8 characters
              </Text>
            )}
            {confirmPassword.length > 0 && setupPassword !== confirmPassword && (
              <Text variant="bodySmall" style={styles.errorText}>
                Passwords do not match
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
              Cancel
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
              Set Password
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
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
