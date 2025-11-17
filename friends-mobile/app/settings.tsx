import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  List,
  Divider,
  ActivityIndicator,
  TextInput,
  Portal,
  Dialog,
} from 'react-native-paper';
import { Stack, router } from 'expo-router';
import { useExportData, useExportStats, useExportPeopleCSV, useImportData } from '@/hooks/useDataExport';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import { useState, useEffect } from 'react';
import { useSettings } from '@/store/useSettings';

export default function SettingsScreen() {
  const exportData = useExportData();
  const exportCSV = useExportPeopleCSV();
  const importData = useImportData();
  const { data: stats, isLoading: statsLoading } = useExportStats();
  const [importLoading, setImportLoading] = useState(false);

  // API Key state
  const { apiKey, setApiKey, clearApiKey, loadApiKey, hasApiKey } = useSettings();
  const [apiKeyDialogVisible, setApiKeyDialogVisible] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  useEffect(() => {
    loadApiKey();
  }, []);

  const handleSaveApiKey = async () => {
    if (tempApiKey.trim().length === 0) {
      Alert.alert('Invalid API Key', 'Please enter a valid API key');
      return;
    }

    try {
      await setApiKey(tempApiKey.trim());
      setApiKeyDialogVisible(false);
      setTempApiKey('');
      Alert.alert('Success', 'API key saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save API key. Please try again.');
    }
  };

  const handleClearApiKey = () => {
    Alert.alert(
      'Clear API Key',
      'Are you sure you want to remove your API key? You will need to re-enter it to use AI extraction.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearApiKey();
            Alert.alert('Success', 'API key cleared.');
          },
        },
      ]
    );
  };

  const handleExportJSON = async () => {
    try {
      await exportData.mutateAsync();
      Alert.alert('Success', 'Data exported successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export data');
    }
  };

  const handleExportCSV = async () => {
    try {
      await exportCSV.mutateAsync();
      Alert.alert('Success', 'People exported to CSV!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export CSV');
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      setImportLoading(true);

      // Read file content
      const expoFile = new ExpoFile(file.uri);
      const content = await expoFile.text();

      const importResult = await importData.mutateAsync(content);

      if (importResult.errors.length > 0) {
        Alert.alert(
          'Import Complete',
          `Imported ${importResult.imported} items.\n\nWarnings:\n${importResult.errors.slice(0, 5).join('\n')}${importResult.errors.length > 5 ? `\n...and ${importResult.errors.length - 5} more` : ''}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Success', `Imported ${importResult.imported} items successfully!`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to import data');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <ScrollView style={styles.container}>
        {/* AI Configuration */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              AI Configuration
            </Text>
            <Divider style={styles.divider} />

            <Text variant="bodySmall" style={styles.description}>
              Configure your Anthropic API key to enable AI-powered story extraction.
            </Text>

            <List.Item
              title="API Key Status"
              description={hasApiKey() ? 'Key is set (stored securely)' : 'Not configured'}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={hasApiKey() ? 'check-circle' : 'alert-circle'}
                  color={hasApiKey() ? '#4caf50' : '#ff9800'}
                />
              )}
            />

            {hasApiKey() ? (
              <View style={styles.apiKeyButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setApiKeyDialogVisible(true)}
                  icon="key-change"
                  style={styles.button}
                >
                  Change API Key
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleClearApiKey}
                  icon="delete"
                  textColor="#d32f2f"
                  style={styles.button}
                >
                  Clear API Key
                </Button>
              </View>
            ) : (
              <Button
                mode="contained"
                onPress={() => setApiKeyDialogVisible(true)}
                icon="key-plus"
                style={styles.button}
              >
                Set API Key
              </Button>
            )}

            <Text variant="labelSmall" style={styles.apiKeyHelp}>
              Get your key from: https://console.anthropic.com
            </Text>
          </Card.Content>
        </Card>

        {/* Security */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Security
            </Text>
            <Divider style={styles.divider} />

            <Text variant="bodySmall" style={styles.description}>
              Store sensitive information securely with biometric protection (Fingerprint/Face ID).
            </Text>

            <Button
              mode="contained"
              onPress={() => router.push('/secrets')}
              icon="shield-lock"
              style={styles.button}
            >
              Manage Secrets
            </Button>
          </Card.Content>
        </Card>

        {/* Data Statistics */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Your Data
            </Text>
            <Divider style={styles.divider} />

            {statsLoading ? (
              <ActivityIndicator />
            ) : (
              <View style={styles.statsContainer}>
                <View style={styles.statRow}>
                  <Text variant="bodyMedium">People:</Text>
                  <Text variant="bodyMedium" style={styles.statValue}>
                    {stats?.people || 0}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text variant="bodyMedium">Relations:</Text>
                  <Text variant="bodyMedium" style={styles.statValue}>
                    {stats?.relations || 0}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text variant="bodyMedium">Connections:</Text>
                  <Text variant="bodyMedium" style={styles.statValue}>
                    {stats?.connections || 0}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text variant="bodyMedium">Stories:</Text>
                  <Text variant="bodyMedium" style={styles.statValue}>
                    {stats?.stories || 0}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text variant="bodyMedium">Events:</Text>
                  <Text variant="bodyMedium" style={styles.statValue}>
                    {stats?.events || 0}
                  </Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Export Options */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Export Data
            </Text>
            <Divider style={styles.divider} />

            <Text variant="bodySmall" style={styles.description}>
              Export your data to back it up or transfer to another device.
            </Text>

            <Button
              mode="contained"
              onPress={handleExportJSON}
              loading={exportData.isPending}
              disabled={exportData.isPending}
              icon="file-export"
              style={styles.button}
            >
              Export All Data (JSON)
            </Button>

            <Button
              mode="outlined"
              onPress={handleExportCSV}
              loading={exportCSV.isPending}
              disabled={exportCSV.isPending}
              icon="file-delimited"
              style={styles.button}
            >
              Export People (CSV)
            </Button>
          </Card.Content>
        </Card>

        {/* Import Options */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Import Data
            </Text>
            <Divider style={styles.divider} />

            <Text variant="bodySmall" style={styles.description}>
              Import data from a previously exported JSON file. Duplicate people (by name) will be
              skipped.
            </Text>

            <Button
              mode="contained"
              onPress={handleImport}
              loading={importLoading || importData.isPending}
              disabled={importLoading || importData.isPending}
              icon="file-import"
              style={styles.button}
            >
              Import from JSON
            </Button>
          </Card.Content>
        </Card>

        {/* App Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              About
            </Text>
            <Divider style={styles.divider} />

            <List.Item
              title="Friends App"
              description="Personal CRM for managing relationships"
              left={(props) => <List.Icon {...props} icon="account-group" />}
            />
            <List.Item
              title="Version"
              description="1.0.0"
              left={(props) => <List.Icon {...props} icon="information" />}
            />
            <List.Item
              title="Data Storage"
              description="All data is stored locally on your device"
              left={(props) => <List.Icon {...props} icon="database" />}
            />
          </Card.Content>
        </Card>

        <View style={styles.spacer} />
      </ScrollView>

      {/* API Key Dialog */}
      <Portal>
        <Dialog visible={apiKeyDialogVisible} onDismiss={() => setApiKeyDialogVisible(false)}>
          <Dialog.Title>{hasApiKey() ? 'Change API Key' : 'Set API Key'}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              Enter your Anthropic API key to enable AI extraction features.
            </Text>
            <TextInput
              mode="outlined"
              label="API Key"
              placeholder="sk-ant-..."
              value={tempApiKey}
              onChangeText={setTempApiKey}
              secureTextEntry
              style={styles.apiKeyInput}
            />
            <Text variant="labelSmall" style={styles.dialogHelper}>
              Your key is stored securely on your device and never sent to any server except Anthropic.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setApiKeyDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSaveApiKey}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  description: {
    opacity: 0.7,
    marginBottom: 16,
  },
  button: {
    marginBottom: 12,
  },
  statsContainer: {
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statValue: {
    fontWeight: 'bold',
  },
  spacer: {
    height: 40,
  },
  apiKeyButtons: {
    gap: 8,
  },
  apiKeyHelp: {
    opacity: 0.6,
    marginTop: 8,
  },
  dialogText: {
    marginBottom: 12,
  },
  dialogHelper: {
    opacity: 0.6,
    marginTop: 8,
  },
  apiKeyInput: {
    marginTop: 8,
  },
});
