import { StyleSheet, ScrollView, Alert, View } from 'react-native';
import { Text, Card, Button, List, Divider, Portal, Dialog, TextInput } from 'react-native-paper';
import { Stack, router } from 'expo-router';
import { useExportStats } from '@/hooks/useDataExport';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  AVAILABLE_COLORS,
} from '@/lib/settings/relationship-colors';

import AppearanceSettings from '@/components/settings/AppearanceSettings';
import AIConfiguration from '@/components/settings/AIConfiguration';
import RelationshipColorsSettings from '@/components/settings/RelationshipColorsSettings';
import DataStatistics from '@/components/settings/DataStatistics';
import BirthdayReminderSettingsSection from '@/components/settings/BirthdayReminderSettings';
import LanguageSelector from '@/components/settings/LanguageSelector';

export default function SettingsScreen() {
  const { t } = useTranslation();

  const { data: stats, isLoading: statsLoading } = useExportStats();

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
    loadMaxPhotosPerPerson,
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
  const [relationshipColors, setRelationshipColors] =
    useState<RelationshipColorMap>(DEFAULT_COLORS);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [selectedRelationType, setSelectedRelationType] = useState<string>('');

  useEffect(() => {
    loadApiKey();
    loadGeminiApiKey();
    loadSelectedModel();
    loadThemeColor();
    loadMaxPhotosPerPerson();
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
    Alert.alert('Clear Gemini API Key', 'Are you sure you want to remove your Gemini API key?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearGeminiApiKey();
          Alert.alert('Success', 'Gemini API key cleared.');
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: t('settings.title') }} />
      <ScrollView style={styles.container}>
        <AppearanceSettings themeColor={themeColor} setThemeColor={setThemeColor} />

        <LanguageSelector />

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
              {t('settings.security')}
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

        <BirthdayReminderSettingsSection
          birthdaySettings={birthdaySettings}
          savingBirthdaySettings={savingBirthdaySettings}
          handleBirthdaySettingChange={handleBirthdaySettingChange}
          upcomingBirthdays={upcomingBirthdays}
        />

        <DataStatistics stats={stats} loading={statsLoading} />

        {/* App Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              {t('settings.about')}
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
          <Dialog.Title>
            {hasApiKey() ? 'Change Claude API Key' : 'Set Claude API Key'}
          </Dialog.Title>
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
        <Dialog
          visible={geminiApiKeyDialogVisible}
          onDismiss={() => setGeminiApiKeyDialogVisible(false)}
        >
          <Dialog.Title>
            {hasGeminiApiKey() ? 'Change Gemini API Key' : 'Set Gemini API Key'}
          </Dialog.Title>
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

        {/* Color Picker Dialog */}
        <Dialog visible={colorPickerVisible} onDismiss={() => setColorPickerVisible(false)}>
          <Dialog.Title>
            Choose Color for{' '}
            {selectedRelationType.charAt(0).toUpperCase() + selectedRelationType.slice(1)}
          </Dialog.Title>
          <Dialog.Content>
            <View style={styles.colorGrid}>
              {AVAILABLE_COLORS.map((color) => (
                <Button
                  key={color.value}
                  mode="outlined"
                  onPress={() => handleColorChange(color.value)}
                  style={[styles.colorButton, { borderColor: color.value, borderWidth: 2 }]}
                  contentStyle={styles.colorButtonContent}
                  labelStyle={{ color: 'transparent' }}
                >
                  <View style={[styles.colorCircle, { backgroundColor: color.value }]} />
                </Button>
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setColorPickerVisible(false)}>Cancel</Button>
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
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  colorButton: {
    width: 60,
    height: 60,
    padding: 0,
    margin: 4,
    borderRadius: 30,
  },
  colorButtonContent: {
    width: 60,
    height: 60,
    padding: 0,
    margin: 0,
  },
  colorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
});
