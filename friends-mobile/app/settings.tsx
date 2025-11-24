import { StyleSheet, ScrollView, Alert, View } from 'react-native';
import {
  Text,
  Card,
  Button,
  List,
  Divider,
  Portal,
  Dialog,
  TextInput,
} from 'react-native-paper';
import { Stack, router } from 'expo-router';
import { useExportData, useExportStats, useExportPeopleCSV, useImportData } from '@/hooks/useDataExport';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import { useState, useEffect } from 'react';
import { useSettings } from '@/store/useSettings';
import {
  getBirthdayReminderSettings,
  saveBirthdayReminderSettings,
  scheduleBirthdayReminders,
  getUpcomingBirthdays,
  type BirthdayReminderSettings,
} from '@/lib/notifications/birthday-reminders';
import {
  getRelationshipColors,
  setRelationshipColor,
  resetRelationshipColors,
  type RelationshipColorMap,
  DEFAULT_COLORS,
} from '@/lib/settings/relationship-colors';

import AppearanceSettings from '@/components/settings/AppearanceSettings';
import AIConfiguration from '@/components/settings/AIConfiguration';
import RelationshipColorsSettings from '@/components/settings/RelationshipColorsSettings';
import DataStatistics from '@/components/settings/DataStatistics';
import ExportImportSettings from '@/components/settings/ExportImportSettings';
import BirthdayReminderSettingsSection from '@/components/settings/BirthdayReminderSettings';

export default function SettingsScreen() {
  const exportData = useExportData();
  const exportCSV = useExportPeopleCSV();
  const importData = useImportData();
  const { data: stats, isLoading: statsLoading } = useExportStats();
  const [importLoading, setImportLoading] = useState(false);

  // API Key state
  const {
    setApiKey,
    setGeminiApiKey,
    clearApiKey,
    clearGeminiApiKey,
    loadApiKey,
    loadGeminiApiKey,
    hasApiKey,
    hasGeminiApiKey,
    selectedModel,
    setSelectedModel,
    loadSelectedModel,
    hasActiveApiKey,
    themeColor,
    setThemeColor,
    loadThemeColor,
  } = useSettings();
  const [apiKeyDialogVisible, setApiKeyDialogVisible] = useState(false);
  const [geminiApiKeyDialogVisible, setGeminiApiKeyDialogVisible] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [tempGeminiApiKey, setTempGeminiApiKey] = useState('');

  // Birthday reminder settings
  const [birthdaySettings, setBirthdaySettings] = useState<BirthdayReminderSettings | null>(null);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([]);
  const [savingBirthdaySettings, setSavingBirthdaySettings] = useState(false);

  // Relationship color settings
  const [relationshipColors, setRelationshipColors] = useState<RelationshipColorMap>(DEFAULT_COLORS);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [selectedRelationType, setSelectedRelationType] = useState<string>('');

  useEffect(() => {
    loadApiKey();
    loadGeminiApiKey();
    loadSelectedModel();
    loadThemeColor();
    loadBirthdaySettings();
    loadRelationshipColors();
  }, []);

  const loadBirthdaySettings = async () => {
    const settings = await getBirthdayReminderSettings();
    setBirthdaySettings(settings);
    const upcoming = await getUpcomingBirthdays(30);
    setUpcomingBirthdays(upcoming);
  };

  const loadRelationshipColors = async () => {
    const colors = await getRelationshipColors();
    setRelationshipColors(colors);
  };

  const handleColorChange = async (color: string) => {
    await setRelationshipColor(selectedRelationType, color);
    setRelationshipColors((prev) => ({ ...prev, [selectedRelationType]: color }));
    setColorPickerVisible(false);
  };

  const handleResetColors = async () => {
    Alert.alert('Reset Colors', 'Reset all relationship colors to default?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          await resetRelationshipColors();
          setRelationshipColors(DEFAULT_COLORS);
          Alert.alert('Success', 'Colors reset to defaults');
        },
      },
    ]);
  };

  const handleBirthdaySettingChange = async (key: keyof BirthdayReminderSettings, value: any) => {
    if (!birthdaySettings) return;

    const newSettings = { ...birthdaySettings, [key]: value };
    setBirthdaySettings(newSettings);

    setSavingBirthdaySettings(true);
    try {
      await saveBirthdayReminderSettings(newSettings);
      if (key === 'enabled' && value === true) {
        const count = await scheduleBirthdayReminders();
        Alert.alert('Birthday Reminders', `Scheduled ${count} birthday reminders!`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSavingBirthdaySettings(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (tempApiKey.trim().length === 0) {
      Alert.alert('Invalid API Key', 'Please enter a valid API key');
      return;
    }

    try {
      await setApiKey(tempApiKey.trim());
      setApiKeyDialogVisible(false);
      setTempApiKey('');
      Alert.alert('Success', 'Anthropic API key saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save API key. Please try again.');
    }
  };

  const handleSaveGeminiApiKey = async () => {
    if (tempGeminiApiKey.trim().length === 0) {
      Alert.alert('Invalid API Key', 'Please enter a valid API key');
      return;
    }

    try {
      await setGeminiApiKey(tempGeminiApiKey.trim());
      setGeminiApiKeyDialogVisible(false);
      setTempGeminiApiKey('');
      Alert.alert('Success', 'Gemini API key saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save API key. Please try again.');
    }
  };

  const handleClearApiKey = () => {
    Alert.alert(
      'Clear Anthropic API Key',
      'Are you sure you want to remove your Anthropic API key?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearApiKey();
            Alert.alert('Success', 'Anthropic API key cleared.');
          },
        },
      ]
    );
  };

  const handleClearGeminiApiKey = () => {
    Alert.alert(
      'Clear Gemini API Key',
      'Are you sure you want to remove your Gemini API key?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearGeminiApiKey();
            Alert.alert('Success', 'Gemini API key cleared.');
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
        <AppearanceSettings themeColor={themeColor} setThemeColor={setThemeColor} />

        <AIConfiguration
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          hasApiKey={hasApiKey}
          hasGeminiApiKey={hasGeminiApiKey}
          hasActiveApiKey={hasActiveApiKey}
          setApiKeyDialogVisible={setApiKeyDialogVisible}
          setGeminiApiKeyDialogVisible={setGeminiApiKeyDialogVisible}
          handleClearApiKey={handleClearApiKey}
          handleClearGeminiApiKey={handleClearGeminiApiKey}
        />

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

        <RelationshipColorsSettings
          relationshipColors={relationshipColors}
          setSelectedRelationType={setSelectedRelationType}
          setColorPickerVisible={setColorPickerVisible}
          handleResetColors={handleResetColors}
        />

        <DataStatistics stats={stats} loading={statsLoading} />

        <ExportImportSettings
          handleExportJSON={handleExportJSON}
          exportDataPending={exportData.isPending}
          handleExportCSV={handleExportCSV}
          exportCSVPending={exportCSV.isPending}
          handleImport={handleImport}
          importLoading={importLoading}
          importDataPending={importData.isPending}
        />

        {/* Experimental */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Experimental
            </Text>
            <Divider style={styles.divider} />
            <Text variant="bodySmall" style={styles.description}>
              Features that are currently in development.
            </Text>
            <Button
              mode="outlined"
              onPress={() => router.push('/(tabs)/network')}
              icon="share-variant"
              style={styles.button}
            >
              Network Graph
            </Button>
          </Card.Content>
        </Card>

        <BirthdayReminderSettingsSection
          birthdaySettings={birthdaySettings}
          savingBirthdaySettings={savingBirthdaySettings}
          handleBirthdaySettingChange={handleBirthdaySettingChange}
          upcomingBirthdays={upcomingBirthdays}
        />

        {/* Developer Tools */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Developer Tools
            </Text>
            <Divider style={styles.divider} />

            <Text variant="bodySmall" style={styles.description}>
              Testing utilities for development. Generate test data, seed sample people, and debug the
              application.
            </Text>

            <Button
              mode="outlined"
              onPress={() => router.push('/dev')}
              icon="code-tags"
              style={styles.button}
            >
              Open Dev Tools
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

      {/* Anthropic API Key Dialog */}
      <Portal>
        <Dialog visible={apiKeyDialogVisible} onDismiss={() => setApiKeyDialogVisible(false)}>
          <Dialog.Title>{hasApiKey() ? 'Change Claude API Key' : 'Set Claude API Key'}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              Enter your Anthropic API key to enable Claude AI extraction.
            </Text>
            <TextInput
              mode="outlined"
              label="API Key"
              placeholder="sk-ant-..."
              value={tempApiKey}
              onChangeText={setTempApiKey}
              secureTextEntry
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setApiKeyDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSaveApiKey}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Gemini API Key Dialog */}
        <Dialog visible={geminiApiKeyDialogVisible} onDismiss={() => setGeminiApiKeyDialogVisible(false)}>
          <Dialog.Title>{hasGeminiApiKey() ? 'Change Gemini API Key' : 'Set Gemini API Key'}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              Enter your Google Gemini API key to enable Gemini AI extraction.
            </Text>
            <TextInput
              mode="outlined"
              label="API Key"
              placeholder="AIza..."
              value={tempGeminiApiKey}
              onChangeText={setTempGeminiApiKey}
              secureTextEntry
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setGeminiApiKeyDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSaveGeminiApiKey}>Save</Button>
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
    paddingTop: 16,
  },
  card: {
    marginBottom: 16,
    marginHorizontal: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  description: {
    marginBottom: 16,
    opacity: 0.7,
  },
  button: {
    marginBottom: 12,
  },
  spacer: {
    height: 40,
  },
  dialogText: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
  },
});
