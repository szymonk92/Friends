import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, Divider, TextInput } from 'react-native-paper';
import { router, Stack } from 'expo-router';
import { seedSampleData, clearAllData } from '@/lib/db/seed';
import { seedTestData, clearTestData } from '@/scripts/seedTestData';
import { resetOnboarding } from './onboarding';
import { useMePerson } from '@/hooks/usePeople';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  testPromptGeneration,
  runMockEvaluation,
  generateComparisonReport,
} from '@/lib/ai/dev-tools/test-prompts';
import { useSettings } from '@/store/useSettings';
import { devLogger } from '@/lib/utils/devLogger';

/**
 * Development utilities screen
 * Access via /dev route
 */
export default function DevScreen() {
  const { t } = useTranslation();
  const { data: mePerson } = useMePerson();
  const [isLoading, setIsLoading] = useState(false);
  const [loadTestCount, setLoadTestCount] = useState('500');
  const [loadTestResult, setLoadTestResult] = useState<string | null>(null);

  const maxPhotosPerPerson = useSettings((state) => state.maxPhotosPerPerson);
  const setMaxPhotosPerPerson = useSettings((state) => state.setMaxPhotosPerPerson);
  const [photoLimitInput, setPhotoLimitInput] = useState(maxPhotosPerPerson.toString());

  useEffect(() => {
    setPhotoLimitInput(maxPhotosPerPerson.toString());
  }, [maxPhotosPerPerson]);

  const handleSeedData = async () => {
    setIsLoading(true);
    try {
      await seedSampleData();
      Alert.alert(
        t('dev.sampleData.successTitle'),
        t('dev.sampleData.successMessage'),
        [{ text: t('common.ok'), onPress: () => router.push('/') }]
      );
    } catch (error) {
      Alert.alert('Error', t('dev.sampleData.errorMessage'));
      devLogger.error('Failed to seed sample data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data?',
      'This will delete ALL people, relations, and stories. This cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await clearAllData();
              Alert.alert('Success', 'All data has been cleared.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data. Check console for details.');
              devLogger.error('Failed to clear all data', error);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleHighLoadTest = async () => {
    const count = parseInt(loadTestCount, 10);
    if (isNaN(count) || count < 1 || count > 1000) {
      Alert.alert('Invalid Count', 'Please enter a number between 1 and 1000');
      return;
    }

    Alert.alert(
      'Generate High Load Test Data',
      `This will create:\n\n• ${count} people\n• ${count * 6} relations (likes, dislikes, diets, etc.)\n• ~${count * 5} connections between people\n\nThis may take a while for large numbers.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setIsLoading(true);
            setLoadTestResult(null);
            try {
              const result = await seedTestData(count);
              setLoadTestResult(
                `✓ Created ${result.peopleCount} people\n✓ Created ${result.connectionsCount} connections\n✓ Time: ${result.duration}s`
              );
              Alert.alert(
                'High Load Test Data Created!',
                `Successfully generated:\n\n• ${result.peopleCount} people\n• ~${result.peopleCount * 6} relations\n• ${result.connectionsCount} connections\n\nTime taken: ${result.duration} seconds`,
                [{ text: 'View People', onPress: () => router.push('/') }]
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to generate test data');
              devLogger.error('Failed to generate high load test data', error);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleClearTestData = async () => {
    Alert.alert(
      'Clear Test Data Only?',
      'This will delete only the high load test data (people with addedBy="test_seed"). Your manually added data will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Test Data',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await clearTestData();
              setLoadTestResult(null);
              Alert.alert('Success', 'Test data has been cleared. Your real data is preserved.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear test data');
              devLogger.error('Failed to clear test data', error);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleTestPromptGeneration = async () => {
    setIsLoading(true);
    try {
      // Run the test (outputs are commented out in the function)
      testPromptGeneration();

      Alert.alert(
        t('dev.aiPromptTesting.testCompleteTitle'),
        t('dev.aiPromptTesting.testCompleteMessage')
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to run prompt generation test');
      devLogger.error('Failed to run prompt generation test', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunMockEvaluation = async () => {
    setIsLoading(true);
    try {
      // Run the mock evaluation
      runMockEvaluation();

      Alert.alert(
        t('dev.aiPromptTesting.mockCompleteTitle'),
        t('dev.aiPromptTesting.mockCompleteMessage')
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to run mock evaluation');
      devLogger.error('Failed to run mock evaluation', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsLoading(true);
    try {
      const report = generateComparisonReport();

      // Show a summary alert
      Alert.alert(
        t('dev.aiPromptTesting.reportCompleteTitle'),
        t('dev.aiPromptTesting.reportCompleteMessage')
      );

      // Log the full report to console
      console.log('\n' + report);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate comparison report');
      devLogger.error('Failed to generate comparison report', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePhotoLimit = async () => {
    const limit = parseInt(photoLimitInput, 10);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      Alert.alert('Invalid Limit', 'Please enter a number between 1 and 100');
      return;
    }

    try {
      await setMaxPhotosPerPerson(limit);
      Alert.alert('Success', `Photo limit set to ${limit} per person`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save photo limit');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('dev.title'),
          presentation: 'modal',
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>
            {t('dev.title')}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {t('dev.subtitle')}
          </Text>

          {/* Dev Logs section */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                📋 Development Logs
              </Text>
              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.description}>
                View, share, and manage persistent development logs for debugging. All debug logs are saved to a file and persist across app restarts.
              </Text>

              <Button
                mode="contained"
                onPress={() => router.push('/dev-logs')}
                style={styles.button}
                icon="file-document-outline"
              >
                View Logs
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                Logs include party operations, AI extraction, database queries, and errors.
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                {t('dev.sampleData.title')}
              </Text>
              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.description}>
                {t('dev.sampleData.description')}
              </Text>

              <Button
                mode="contained"
                onPress={handleSeedData}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
              >
                {t('dev.sampleData.buttonSeed')}
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                {t('dev.sampleData.buttonNote')}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                {t('dev.highLoadTest.title')}
              </Text>
              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.description}>
                {t('dev.highLoadTest.description')}
              </Text>

              <TextInput
                mode="outlined"
                label={t('dev.highLoadTest.inputLabel')}
                value={loadTestCount}
                onChangeText={setLoadTestCount}
                keyboardType="numeric"
                style={styles.input}
              />

              <Button
                mode="contained"
                onPress={handleHighLoadTest}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                icon="database-plus"
              >
                {t('dev.highLoadTest.buttonGenerate', { count: parseInt(loadTestCount, 10) || 0 })}
              </Button>

              {loadTestResult && (
                <Text variant="bodySmall" style={styles.successNote}>
                  {loadTestResult}
                </Text>
              )}

              <Button
                mode="outlined"
                onPress={handleClearTestData}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                icon="database-remove"
              >
                {t('dev.highLoadTest.buttonClearTest')}
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                {t('dev.highLoadTest.note')}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                {t('dev.clearData.title')}
              </Text>
              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.description}>
                {t('dev.clearData.description')}
              </Text>

              <Button
                mode="outlined"
                onPress={handleClearData}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                buttonColor="#ffebee"
                textColor="#d32f2f"
              >
                {t('dev.clearData.button')}
              </Button>

              <Text variant="bodySmall" style={styles.warningNote}>
                {t('dev.clearData.warning')}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                Photo Settings
              </Text>
              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.description}>
                Configure the maximum number of photos that can be added per person. This helps manage storage and keeps profiles organized.
              </Text>

              <TextInput
                mode="outlined"
                label="Max Photos Per Person"
                value={photoLimitInput}
                onChangeText={setPhotoLimitInput}
                keyboardType="numeric"
                style={styles.input}
              />

              <Button
                mode="contained"
                onPress={handleSavePhotoLimit}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                icon="content-save"
              >
                Save Photo Limit
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                Current limit: {maxPhotosPerPerson} photos per person. Valid range: 1-100.
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                {t('dev.aiPromptTesting.title')}
              </Text>
              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.description}>
                {t('dev.aiPromptTesting.description')}
              </Text>

              <Button
                mode="contained"
                onPress={handleTestPromptGeneration}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                icon="code-tags"
              >
                {t('dev.aiPromptTesting.buttonTestGeneration')}
              </Button>

              <Button
                mode="contained"
                onPress={handleRunMockEvaluation}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                icon="checkbox-marked-circle"
              >
                {t('dev.aiPromptTesting.buttonMockEvaluation')}
              </Button>

              <Button
                mode="contained"
                onPress={handleGenerateReport}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                icon="file-document"
              >
                {t('dev.aiPromptTesting.buttonGenerateReport')}
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                {t('dev.aiPromptTesting.note')}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                {t('dev.quickActions.title')}
              </Text>
              <Divider style={styles.divider} />

              <Button
                mode="outlined"
                onPress={() => router.push('/')}
                style={styles.button}
                icon="account-group"
              >
                {t('dev.quickActions.viewPeople')}
              </Button>

              <Button
                mode="outlined"
                onPress={() => router.push('/story/addStory')}
                style={styles.button}
                icon="text-box-plus"
              >
                {t('dev.quickActions.tellStory')}
              </Button>

              <Button
                mode="outlined"
                onPress={() => router.push('/modal')}
                style={styles.button}
                icon="account-plus"
              >
                {t('dev.quickActions.addPerson')}
              </Button>

              <Button
                mode="contained"
                onPress={() => router.push('/documentation')}
                style={styles.button}
                icon="book-open-variant"
              >
                View Documentation
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                Learn about relation types, statuses, and app terminology
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                Food Preferences Quiz
              </Text>
              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.description}>
                Tinder-style swipe quiz to quickly add food preferences for your primary contacts. Swipe
                right for likes, left for dislikes, down for unknown.
              </Text>

              <Button
                mode="contained"
                onPress={() => router.push('/food-quiz')}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                icon="food-apple"
              >
                Start Food Quiz
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                Asks about popular foods like tomatoes, mushrooms, spicy food, etc. for primary people
                only.
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                Party Planning
              </Text>
              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.description}>
                Organize a party or gathering. Select guests, get seating suggestions based on their
                connections, and see food recommendations based on everyone's preferences.
              </Text>

              <Button
                mode="contained"
                onPress={() => router.push('/party-planner')}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                icon="party-popper"
              >
                Plan a Party
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                Creates an event with date, location, guest list, and AI-powered suggestions for seating
                and menu.
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                My Preferences
              </Text>
              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.description}>
                Track your own preferences, skills, and traits. This is your personal profile for
                managing what you like, dislike, know, and care about.
              </Text>

              <Button
                mode="contained"
                onPress={() => {
                  if (mePerson) {
                    router.push(`/person/${mePerson.id}`);
                  } else {
                    Alert.alert('Not Found', 'Your profile could not be found.');
                  }
                }}
                style={styles.button}
                icon="account-circle"
              >
                Open My Profile
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                Add your food preferences, skills, hobbies, and other personal traits.
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                Reset App State
              </Text>
              <Divider style={styles.divider} />

              <Button
                mode="outlined"
                onPress={async () => {
                  await resetOnboarding();
                  Alert.alert('Success', 'Onboarding reset. Restart the app to see it again.');
                }}
                style={styles.button}
                icon="restart"
              >
                Reset Onboarding
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                Shows the intro tutorial again on next app start.
              </Text>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.7,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  description: {
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
  },
  note: {
    opacity: 0.7,
    fontStyle: 'italic',
  },
  successNote: {
    color: '#4caf50',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  warningNote: {
    color: '#d32f2f',
    fontStyle: 'italic',
  },
});
