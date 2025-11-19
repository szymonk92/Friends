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
  Switch,
  SegmentedButtons,
} from 'react-native-paper';
import { Stack, router } from 'expo-router';
import { useExportData, useExportStats, useExportPeopleCSV, useImportData } from '@/hooks/useDataExport';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import { useState, useEffect } from 'react';
import { useSettings, THEME_COLORS, type ThemeColor } from '@/store/useSettings';
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
  AVAILABLE_COLORS,
  DEFAULT_COLORS,
  type RelationshipColorMap,
} from '@/lib/settings/relationship-colors';

export default function SettingsScreen() {
  const exportData = useExportData();
  const exportCSV = useExportPeopleCSV();
  const importData = useImportData();
  const { data: stats, isLoading: statsLoading } = useExportStats();
  const [importLoading, setImportLoading] = useState(false);

  // API Key state
  const { apiKey, setApiKey, clearApiKey, loadApiKey, hasApiKey, themeColor, setThemeColor, loadThemeColor } = useSettings();
  const [apiKeyDialogVisible, setApiKeyDialogVisible] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

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
        {/* Appearance */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Appearance
            </Text>
            <Divider style={styles.divider} />

            <Text variant="bodySmall" style={styles.description}>
              Customize the look and feel of the app by choosing your preferred theme color.
            </Text>

            <Text variant="labelMedium" style={styles.themeLabel}>
              Theme Color
            </Text>
            <View style={styles.themeGrid}>
              {(Object.keys(THEME_COLORS) as ThemeColor[]).map((color) => (
                <Button
                  key={color}
                  mode={themeColor === color ? 'contained' : 'outlined'}
                  onPress={() => setThemeColor(color)}
                  style={[
                    styles.themeButton,
                    themeColor === color && { backgroundColor: THEME_COLORS[color] },
                  ]}
                  labelStyle={[
                    styles.themeButtonLabel,
                    themeColor !== color && { color: THEME_COLORS[color] },
                  ]}
                  contentStyle={styles.themeButtonContent}
                >
                  <View style={[styles.themeColorDot, { backgroundColor: THEME_COLORS[color] }]} />
                  {color.charAt(0).toUpperCase() + color.slice(1)}
                </Button>
              ))}
            </View>
          </Card.Content>
        </Card>

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

        {/* Relationship Colors */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Relationship Colors
            </Text>
            <Divider style={styles.divider} />

            <Text variant="bodySmall" style={styles.description}>
              Customize colors for different relationship types to easily identify them in the app.
            </Text>

            {Object.keys(DEFAULT_COLORS).map((type) => (
              <List.Item
                key={type}
                title={type.charAt(0).toUpperCase() + type.slice(1)}
                left={() => (
                  <View
                    style={[styles.colorSwatch, { backgroundColor: relationshipColors[type] }]}
                  />
                )}
                right={() => (
                  <Button
                    compact
                    mode="text"
                    onPress={() => {
                      setSelectedRelationType(type);
                      setColorPickerVisible(true);
                    }}
                  >
                    Change
                  </Button>
                )}
              />
            ))}

            <Button
              mode="outlined"
              onPress={handleResetColors}
              icon="refresh"
              style={styles.button}
            >
              Reset to Defaults
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

        {/* Birthday Reminders */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Birthday Reminders
            </Text>
            <Divider style={styles.divider} />

            {birthdaySettings && (
              <>
                <List.Item
                  title="Enable Reminders"
                  description="Get notified about upcoming birthdays"
                  left={(props) => <List.Icon {...props} icon="bell" />}
                  right={() => (
                    <Switch
                      value={birthdaySettings.enabled}
                      onValueChange={(value) => handleBirthdaySettingChange('enabled', value)}
                      disabled={savingBirthdaySettings}
                    />
                  )}
                />

                {birthdaySettings.enabled && (
                  <>
                    <List.Item
                      title="Remind on Birthday"
                      description="Notify me on the actual birthday"
                      left={(props) => <List.Icon {...props} icon="cake-variant" />}
                      right={() => (
                        <Switch
                          value={birthdaySettings.remindOnDay}
                          onValueChange={(value) => handleBirthdaySettingChange('remindOnDay', value)}
                        />
                      )}
                    />

                    <View style={styles.settingRow}>
                      <Text variant="bodyMedium">Days before reminder:</Text>
                      <SegmentedButtons
                        value={String(birthdaySettings.daysBefore)}
                        onValueChange={(value) => handleBirthdaySettingChange('daysBefore', parseInt(value))}
                        buttons={[
                          { value: '0', label: 'None' },
                          { value: '1', label: '1' },
                          { value: '3', label: '3' },
                          { value: '7', label: '7' },
                        ]}
                        style={styles.segmentedButtons}
                      />
                    </View>

                    <List.Item
                      title="Only Important People"
                      description="Only remind for important+ people"
                      left={(props) => <List.Icon {...props} icon="star" />}
                      right={() => (
                        <Switch
                          value={birthdaySettings.onlyImportantPeople}
                          onValueChange={(value) => handleBirthdaySettingChange('onlyImportantPeople', value)}
                        />
                      )}
                    />

                    {birthdaySettings.onlyImportantPeople && (
                      <View style={styles.settingRow}>
                        <Text variant="bodyMedium">Minimum importance:</Text>
                        <SegmentedButtons
                          value={birthdaySettings.importanceThreshold}
                          onValueChange={(value) => handleBirthdaySettingChange('importanceThreshold', value)}
                          buttons={[
                            { value: 'important', label: 'Important' },
                            { value: 'very_important', label: 'Very' },
                            { value: 'critical', label: 'Critical' },
                          ]}
                          style={styles.segmentedButtons}
                        />
                      </View>
                    )}
                  </>
                )}

                {upcomingBirthdays.length > 0 && (
                  <View style={styles.upcomingContainer}>
                    <Text variant="titleSmall" style={styles.upcomingTitle}>
                      Upcoming Birthdays (30 days):
                    </Text>
                    {upcomingBirthdays.slice(0, 5).map((item) => (
                      <List.Item
                        key={item.person.id}
                        title={item.person.name}
                        description={`In ${item.daysUntil} days (turning ${item.age})`}
                        left={(props) => <List.Icon {...props} icon="cake" />}
                        onPress={() => router.push(`/person/${item.person.id}`)}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
          </Card.Content>
        </Card>

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

      {/* Color Picker Dialog */}
      <Portal>
        <Dialog visible={colorPickerVisible} onDismiss={() => setColorPickerVisible(false)}>
          <Dialog.Title>Choose Color for {selectedRelationType}</Dialog.Title>
          <Dialog.Content>
            <View style={styles.colorGrid}>
              {AVAILABLE_COLORS.map((color) => (
                <Button
                  key={color.value}
                  mode={relationshipColors[selectedRelationType] === color.value ? 'contained' : 'outlined'}
                  onPress={() => handleColorChange(color.value)}
                  style={[styles.colorButton, { borderColor: color.value }]}
                  labelStyle={{ color: color.value }}
                  compact
                >
                  <View style={[styles.colorPreview, { backgroundColor: color.value }]} />
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
  settingRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  segmentedButtons: {
    marginTop: 8,
  },
  upcomingContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  upcomingTitle: {
    paddingHorizontal: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  colorButton: {
    margin: 4,
    minWidth: 60,
  },
  colorPreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  themeLabel: {
    marginBottom: 12,
    opacity: 0.8,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeButton: {
    flex: 1,
    minWidth: '45%',
  },
  themeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeButtonLabel: {
    fontSize: 14,
  },
  themeColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 4,
  },
});
