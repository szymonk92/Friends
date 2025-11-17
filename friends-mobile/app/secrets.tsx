import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, Alert, FlatList } from 'react-native';
import {
  Text,
  Card,
  Button,
  FAB,
  TextInput,
  ActivityIndicator,
  Chip,
  IconButton,
  Dialog,
  Portal,
  Menu,
} from 'react-native-paper';
import { Stack, router } from 'expo-router';
import {
  useBiometricStatus,
  useSecretsSetupStatus,
  useInitializeSecrets,
  useSecrets,
  useCreateSecret,
  useDecryptSecret,
  useDeleteSecret,
  useInitializeWithPassword,
  usePasswordBasedEncryption,
} from '@/hooks/useSecrets';
import { usePeople } from '@/hooks/usePeople';
import { getBiometricTypeName } from '@/lib/crypto/biometric-secrets';
import { formatRelativeTime } from '@/lib/utils/format';

export default function SecretsScreen() {
  const { data: biometricStatus, isLoading: loadingBiometric } = useBiometricStatus();
  const { data: isSetup, isLoading: loadingSetup } = useSecretsSetupStatus();
  const { data: isPasswordBased } = usePasswordBasedEncryption();
  const initializeSecrets = useInitializeSecrets();
  const initializeWithPassword = useInitializeWithPassword();
  const { data: secrets = [], isLoading: loadingSecrets } = useSecrets();
  const { data: people = [] } = usePeople();
  const createSecret = useCreateSecret();
  const decryptSecret = useDecryptSecret();
  const deleteSecret = useDeleteSecret();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showPasswordSetupDialog, setShowPasswordSetupDialog] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showPersonMenu, setShowPersonMenu] = useState(false);
  const [newSecretTitle, setNewSecretTitle] = useState('');
  const [newSecretContent, setNewSecretContent] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | undefined>(undefined);
  const [setupPassword, setSetupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [pendingAction, setPendingAction] = useState<'create' | 'view' | null>(null);
  const [pendingSecretId, setPendingSecretId] = useState<string | null>(null);
  const [viewedSecret, setViewedSecret] = useState<{
    id: string;
    title: string;
    content: string;
  } | null>(null);
  const [remainingTime, setRemainingTime] = useState(60);

  // Security: Auto-clear decrypted secret after 60 seconds
  const secretViewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (showViewDialog && viewedSecret) {
      // Reset countdown
      setRemainingTime(60);

      // Clear any existing timers
      if (secretViewTimerRef.current) {
        clearTimeout(secretViewTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }

      // Set countdown interval
      countdownTimerRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Set timer to auto-close after 60 seconds
      secretViewTimerRef.current = setTimeout(() => {
        setShowViewDialog(false);
        setViewedSecret(null);
        Alert.alert('Security', 'Secret view closed automatically for security.');
      }, 60000);
    }

    return () => {
      if (secretViewTimerRef.current) {
        clearTimeout(secretViewTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [showViewDialog, viewedSecret]);

  // Clear password from memory immediately after use
  const clearSensitiveData = () => {
    setAccessPassword('');
    setSetupPassword('');
    setConfirmPassword('');
  };

  const handleSetup = async () => {
    try {
      await initializeSecrets.mutateAsync();
      Alert.alert('Success', 'Secrets protection has been set up successfully!');
    } catch (error) {
      Alert.alert('Setup Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handlePasswordSetup = async () => {
    if (setupPassword.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters long.');
      return;
    }

    if (setupPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match. Please try again.');
      return;
    }

    Alert.alert(
      'IMPORTANT WARNING',
      'You are about to set a password for your secrets.\n\n' +
        '⚠️ IF YOU FORGET THIS PASSWORD, YOUR SECRETS CANNOT BE RECOVERED. ⚠️\n\n' +
        'There is NO password reset option. All encrypted secrets will be permanently lost.\n\n' +
        'Make sure you remember this password or write it down in a safe place.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I Understand, Continue',
          style: 'destructive',
          onPress: async () => {
            try {
              await initializeWithPassword.mutateAsync(setupPassword);
              setShowPasswordSetupDialog(false);
              setSetupPassword('');
              setConfirmPassword('');
              Alert.alert('Success', 'Password-based secrets protection has been set up!');
            } catch (error) {
              Alert.alert('Setup Failed', error instanceof Error ? error.message : 'Unknown error');
            }
          },
        },
      ]
    );
  };

  const handleCreateSecret = async (password?: string) => {
    if (!newSecretTitle.trim() || !newSecretContent.trim()) {
      Alert.alert('Error', 'Please enter both title and content');
      return;
    }

    // If password mode and no password provided, show prompt
    if (isPasswordBased && !password) {
      setPendingAction('create');
      setShowPasswordPrompt(true);
      return;
    }

    try {
      await createSecret.mutateAsync({
        title: newSecretTitle.trim(),
        content: newSecretContent.trim(),
        personId: selectedPersonId,
        password,
      });
      setShowCreateDialog(false);
      setNewSecretTitle('');
      setNewSecretContent('');
      setSelectedPersonId(undefined);
      Alert.alert('Success', 'Secret saved and encrypted!');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save secret';
      if (errorMsg === 'Invalid password') {
        Alert.alert('Wrong Password', 'The password you entered is incorrect.');
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
  };

  const handleViewSecret = async (secretId: string, password?: string) => {
    // If password mode and no password provided, show prompt
    if (isPasswordBased && !password) {
      setPendingAction('view');
      setPendingSecretId(secretId);
      setShowPasswordPrompt(true);
      return;
    }

    try {
      const decrypted = await decryptSecret.mutateAsync({ secretId, password });
      setViewedSecret(decrypted);
      setShowViewDialog(true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to decrypt secret';
      if (errorMsg === 'Invalid password') {
        Alert.alert('Wrong Password', 'The password you entered is incorrect.');
      } else {
        Alert.alert('Access Denied', errorMsg);
      }
    }
  };

  const handlePasswordSubmit = async () => {
    if (!accessPassword) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setShowPasswordPrompt(false);

    if (pendingAction === 'create') {
      await handleCreateSecret(accessPassword);
    } else if (pendingAction === 'view' && pendingSecretId) {
      await handleViewSecret(pendingSecretId, accessPassword);
    }

    setAccessPassword('');
    setPendingAction(null);
    setPendingSecretId(null);
  };

  const handleDeleteSecret = (secretId: string, title: string) => {
    Alert.alert(
      'Delete Secret',
      `Are you sure you want to delete "${title}"?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSecret.mutateAsync(secretId);
              Alert.alert('Deleted', 'Secret has been deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete secret');
            }
          },
        },
      ]
    );
  };

  if (loadingBiometric || loadingSetup) {
    return (
      <>
        <Stack.Screen options={{ title: 'Secrets' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Checking device security...</Text>
        </View>
      </>
    );
  }

  // Setup screen if not initialized
  if (!isSetup) {
    const hasBiometrics = biometricStatus?.isEnrolled;

    return (
      <>
        <Stack.Screen options={{ title: 'Setup Secrets' }} />
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

  // Main secrets list
  return (
    <>
      <Stack.Screen options={{ title: 'Secrets' }} />
      <View style={styles.container}>
        <Card style={styles.statusCard}>
          <Card.Content style={styles.statusContent}>
            <Chip icon="shield-lock" style={styles.statusChip}>
              Protected by {isPasswordBased ? 'Password' : getBiometricTypeName(biometricStatus?.biometricType || 'none')}
            </Chip>
            <Text variant="bodySmall" style={styles.statusText}>
              {secrets.length} secret(s) stored
            </Text>
          </Card.Content>
        </Card>

        {loadingSecrets ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" />
          </View>
        ) : secrets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No Secrets Yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Tap the + button to add your first secret
            </Text>
          </View>
        ) : (
          <FlatList
            data={secrets}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const associatedPerson = item.personId
                ? people.find((p) => p.id === item.personId)
                : null;
              return (
                <Card style={styles.secretCard} onPress={() => handleViewSecret(item.id)}>
                  <Card.Content style={styles.secretCardContent}>
                    <View style={styles.secretInfo}>
                      <Text variant="titleMedium">{item.title}</Text>
                      {associatedPerson && (
                        <Text variant="bodySmall" style={styles.personTag}>
                          {associatedPerson.name}
                        </Text>
                      )}
                      <Text variant="bodySmall" style={styles.secretDate}>
                        {formatRelativeTime(new Date(item.createdAt))}
                      </Text>
                    </View>
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => handleDeleteSecret(item.id, item.title)}
                    />
                  </Card.Content>
                </Card>
              );
            }}
          />
        )}

        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => setShowCreateDialog(true)}
          label="Add Secret"
        />

        {/* Create Secret Dialog */}
        <Portal>
          <Dialog visible={showCreateDialog} onDismiss={() => setShowCreateDialog(false)}>
            <Dialog.Title>New Secret</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label="Title"
                value={newSecretTitle}
                onChangeText={setNewSecretTitle}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Secret Content"
                value={newSecretContent}
                onChangeText={setNewSecretContent}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
                secureTextEntry
              />
              <Menu
                visible={showPersonMenu}
                onDismiss={() => setShowPersonMenu(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setShowPersonMenu(true)}
                    style={styles.personSelector}
                    icon="account"
                  >
                    {selectedPersonId
                      ? people.find((p) => p.id === selectedPersonId)?.name || 'Select Person'
                      : 'Associate with Person (Optional)'}
                  </Button>
                }
              >
                <Menu.Item
                  onPress={() => {
                    setSelectedPersonId(undefined);
                    setShowPersonMenu(false);
                  }}
                  title="No Association"
                />
                {people.map((person) => (
                  <Menu.Item
                    key={person.id}
                    onPress={() => {
                      setSelectedPersonId(person.id);
                      setShowPersonMenu(false);
                    }}
                    title={person.name}
                  />
                ))}
              </Menu>
              <Text variant="bodySmall" style={styles.dialogHint}>
                Content will be encrypted with your {isPasswordBased ? 'password' : 'biometric key'}
              </Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button
                onPress={() => handleCreateSecret()}
                loading={createSecret.isPending}
                disabled={createSecret.isPending}
              >
                Save
              </Button>
            </Dialog.Actions>
          </Dialog>

          {/* View Secret Dialog */}
          <Dialog
            visible={showViewDialog}
            onDismiss={() => {
              setShowViewDialog(false);
              setViewedSecret(null);
            }}
          >
            <Dialog.Title>{viewedSecret?.title || 'Secret'}</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodySmall" style={styles.securityTimer}>
                Auto-closing in {remainingTime}s for security
              </Text>
              <Text variant="bodyMedium" style={styles.secretContent}>
                {viewedSecret?.content}
              </Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button
                onPress={() => {
                  setShowViewDialog(false);
                  setViewedSecret(null);
                }}
              >
                Close
              </Button>
            </Dialog.Actions>
          </Dialog>

          {/* Password Prompt Dialog */}
          <Dialog
            visible={showPasswordPrompt}
            onDismiss={() => {
              setShowPasswordPrompt(false);
              setAccessPassword('');
              setPendingAction(null);
              setPendingSecretId(null);
            }}
          >
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
              <Button
                onPress={() => {
                  setShowPasswordPrompt(false);
                  setAccessPassword('');
                  setPendingAction(null);
                  setPendingSecretId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onPress={handlePasswordSubmit}
                loading={createSecret.isPending || decryptSecret.isPending}
                disabled={!accessPassword || createSecret.isPending || decryptSecret.isPending}
              >
                Submit
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    opacity: 0.7,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  warning: {
    textAlign: 'center',
    color: '#ff9800',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  button: {
    marginTop: 16,
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
  setupButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  statusCard: {
    margin: 16,
    marginBottom: 8,
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    backgroundColor: '#e8f5e9',
  },
  statusText: {
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    marginBottom: 8,
  },
  emptyText: {
    opacity: 0.6,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  secretCard: {
    marginBottom: 12,
  },
  secretCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secretInfo: {
    flex: 1,
  },
  secretDate: {
    opacity: 0.6,
    marginTop: 4,
  },
  personTag: {
    color: '#6200ee',
    marginTop: 2,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  input: {
    marginBottom: 12,
  },
  dialogHint: {
    opacity: 0.6,
    fontStyle: 'italic',
  },
  secretContent: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontFamily: 'monospace',
  },
  alternativeButton: {
    marginTop: 12,
    paddingHorizontal: 24,
  },
  warningText: {
    color: '#f57c00',
    fontWeight: '500',
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
  errorText: {
    color: '#d32f2f',
    marginTop: -8,
    marginBottom: 8,
  },
  personSelector: {
    marginBottom: 12,
  },
  passwordPromptText: {
    marginBottom: 16,
    opacity: 0.7,
  },
  securityTimer: {
    color: '#ff5722',
    marginBottom: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
