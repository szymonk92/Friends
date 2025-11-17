import { useState } from 'react';
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
} from '@/hooks/useSecrets';
import { getBiometricTypeName } from '@/lib/crypto/biometric-secrets';
import { formatRelativeTime } from '@/lib/utils/format';

export default function SecretsScreen() {
  const { data: biometricStatus, isLoading: loadingBiometric } = useBiometricStatus();
  const { data: isSetup, isLoading: loadingSetup } = useSecretsSetupStatus();
  const initializeSecrets = useInitializeSecrets();
  const { data: secrets = [], isLoading: loadingSecrets } = useSecrets();
  const createSecret = useCreateSecret();
  const decryptSecret = useDecryptSecret();
  const deleteSecret = useDeleteSecret();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [newSecretTitle, setNewSecretTitle] = useState('');
  const [newSecretContent, setNewSecretContent] = useState('');
  const [viewedSecret, setViewedSecret] = useState<{
    id: string;
    title: string;
    content: string;
  } | null>(null);

  const handleSetup = async () => {
    try {
      await initializeSecrets.mutateAsync();
      Alert.alert('Success', 'Secrets protection has been set up successfully!');
    } catch (error) {
      Alert.alert('Setup Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleCreateSecret = async () => {
    if (!newSecretTitle.trim() || !newSecretContent.trim()) {
      Alert.alert('Error', 'Please enter both title and content');
      return;
    }

    try {
      await createSecret.mutateAsync({
        title: newSecretTitle.trim(),
        content: newSecretContent.trim(),
      });
      setShowCreateDialog(false);
      setNewSecretTitle('');
      setNewSecretContent('');
      Alert.alert('Success', 'Secret saved and encrypted!');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save secret');
    }
  };

  const handleViewSecret = async (secretId: string) => {
    try {
      const decrypted = await decryptSecret.mutateAsync(secretId);
      setViewedSecret(decrypted);
      setShowViewDialog(true);
    } catch (error) {
      Alert.alert(
        'Access Denied',
        error instanceof Error ? error.message : 'Failed to decrypt secret'
      );
    }
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

  // Check biometric availability
  if (!biometricStatus?.isEnrolled) {
    return (
      <>
        <Stack.Screen options={{ title: 'Secrets' }} />
        <View style={styles.centered}>
          <Text variant="headlineSmall" style={styles.title}>
            Biometric Required
          </Text>
          <Text variant="bodyMedium" style={styles.description}>
            Secrets are protected by your device's biometric security (fingerprint or Face ID).
          </Text>
          <Text variant="bodyMedium" style={styles.warning}>
            Please set up fingerprint or face recognition in your device settings to use this
            feature.
          </Text>
          <Button mode="contained" onPress={() => router.back()} style={styles.button}>
            Go Back
          </Button>
        </View>
      </>
    );
  }

  // Setup screen if not initialized
  if (!isSetup) {
    return (
      <>
        <Stack.Screen options={{ title: 'Setup Secrets' }} />
        <View style={styles.centered}>
          <Text variant="headlineSmall" style={styles.title}>
            Secure Your Secrets
          </Text>
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

          <Button
            mode="contained"
            icon="fingerprint"
            onPress={handleSetup}
            loading={initializeSecrets.isPending}
            disabled={initializeSecrets.isPending}
            style={styles.setupButton}
          >
            {initializeSecrets.isPending ? 'Setting up...' : 'Enable Secrets Protection'}
          </Button>
        </View>
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
              Protected by {getBiometricTypeName(biometricStatus.biometricType)}
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
            renderItem={({ item }) => (
              <Card style={styles.secretCard} onPress={() => handleViewSecret(item.id)}>
                <Card.Content style={styles.secretCardContent}>
                  <View style={styles.secretInfo}>
                    <Text variant="titleMedium">{item.title}</Text>
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
            )}
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
              <Text variant="bodySmall" style={styles.dialogHint}>
                Content will be encrypted with your biometric key
              </Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button
                onPress={handleCreateSecret}
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
});
