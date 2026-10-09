import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Button, Card, Divider, TextInput } from 'react-native-paper';
import { router, Stack } from 'expo-router';
import { confirmDestructive, fzAlert } from '@/lib/utils/confirm';
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
import { useSettings, AVAILABLE_FONTS, type FontFamily } from '@/store/useSettings';
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

  const { fontFamily, setFontFamily } = useSettings();
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
      fzAlert(t('dev.sampleData.successTitle'), t('dev.sampleData.successMessage'), [
        { text: t('common.ok'), onPress: () => router.push('/') },
      ]);
    } catch (error) {
      fzAlert(t('common.error'), t('dev.sampleData.errorMessage'));
      devLogger.error('Failed to seed sample data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = () => {
    confirmDestructive({
      title: t('dev.clearData.confirmTitle'),
      message: t('dev.clearData.confirmMessage'),
      confirmLabel: t('dev.clearData.clearAll'),
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await clearAllData();
          fzAlert(t('common.success'), t('dev.clearData.success'));
        } catch (error) {
          fzAlert(t('common.error'), t('dev.clearData.error'));
          devLogger.error('Failed to clear all data', error);
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const handleHighLoadTest = async () => {
    const count = parseInt(loadTestCount, 10);
    if (isNaN(count) || count < 1 || count > 1000) {
      fzAlert(t('dev.highLoadTest.errorInvalidCount'), t('dev.highLoadTest.errorInvalidMessage'));
      return;
    }

    fzAlert(
      t('dev.highLoadTest.confirmTitle'),
      t('dev.highLoadTest.confirmMessage', {
        count,
        relations: count * 6,
        connections: count * 5,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('dev.highLoadTest.generate'),
          onPress: async () => {
            setIsLoading(true);
            setLoadTestResult(null);
            try {
              const result = await seedTestData(count);
              setLoadTestResult(
                t('dev.highLoadTest.resultSummary', {
                  peopleCount: result.peopleCount,
                  connectionsCount: result.connectionsCount,
                  duration: result.duration,
                })
              );
              fzAlert(
                t('dev.highLoadTest.successTitle'),
                t('dev.highLoadTest.successMessage', {
                  peopleCount: result.peopleCount,
                  relationsCount: result.peopleCount * 6,
                  connectionsCount: result.connectionsCount,
                  duration: result.duration,
                }),
                [{ text: t('dev.sampleData.viewPeople'), onPress: () => router.push('/') }]
              );
            } catch (error: any) {
              fzAlert(t('common.error'), error.message || t('dev.highLoadTest.generateFailed'));
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
    confirmDestructive({
      title: t('dev.highLoadTest.clearConfirmTitle'),
      message:
        t('dev.highLoadTest.clearConfirmMessage'),
      confirmLabel: 'Clear Test Data',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await clearTestData();
          setLoadTestResult(null);
          fzAlert(t('common.success'), t('dev.highLoadTest.clearSuccess'));
        } catch (error) {
          fzAlert(t('common.error'), t('dev.highLoadTest.clearError'));
          devLogger.error(t('dev.highLoadTest.clearError'), error);
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const handleTestPromptGeneration = async () => {
    setIsLoading(true);
    try {
      // Run the test (outputs are commented out in the function)
      testPromptGeneration();

      fzAlert(
        t('dev.aiPromptTesting.testCompleteTitle'),
        t('dev.aiPromptTesting.testCompleteMessage')
      );
    } catch (error: any) {
      fzAlert(t('common.error'), error.message || t('dev.aiPromptTesting.testFailed'));
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

      fzAlert(
        t('dev.aiPromptTesting.mockCompleteTitle'),
        t('dev.aiPromptTesting.mockCompleteMessage')
      );
    } catch (error: any) {
      fzAlert(t('common.error'), error.message || t('dev.aiPromptTesting.mockFailed'));
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
      fzAlert(
        t('dev.aiPromptTesting.reportCompleteTitle'),
        t('dev.aiPromptTesting.reportCompleteMessage')
      );

      // Log the full report to console
      console.log('\n' + report);
    } catch (error: any) {
      fzAlert(t('common.error'), error.message || t('dev.aiPromptTesting.reportFailed'));
      devLogger.error('Failed to generate comparison report', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePhotoLimit = async () => {
    const limit = parseInt(photoLimitInput, 10);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      fzAlert(t('dev.invalidLimit'), t('dev.invalidLimitMessage'));
      return;
    }

    try {
      await setMaxPhotosPerPerson(limit);
      fzAlert(t('common.success'), t('dev.photoSet', { count: limit }));
    } catch (error: any) {
      fzAlert(t('common.error'), error.message || t('dev.photoSaveFailed'));
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

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                {t('dev.appearance')}
              </Text>
              <Divider style={styles.divider} />

              <Text variant="titleMedium" style={{ marginBottom: 8 }}>
                {t('settings.fontFamily')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {(Object.keys(AVAILABLE_FONTS) as FontFamily[]).map((font) => (
                  <Button
                    key={font}
                    mode={fontFamily === font ? 'contained' : 'outlined'}
                    onPress={() => setFontFamily(font)}
                    compact
                  >
                    {font}
                  </Button>
                ))}
              </View>
            </Card.Content>
          </Card>

          {/* Dev Logs section */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                {t('dev.logsTitle')}
              </Text>
              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.description}>
                {t('dev.logsDescription')}
              </Text>

              <Button
                mode="contained"
                onPress={() => router.push('/dev-logs')}
                style={styles.button}
                icon="file-document-outline"
              >
                {t('dev.viewLogs')}
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                {t('dev.logsNote')}
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
                {t('dev.photoTitle')}
              </Text>
              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.description}>
                {t('dev.photoDescription')}
              </Text>

              <TextInput
                mode="outlined"
                label={t('dev.photoLabel')}
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
                {t('dev.photoSave')}
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                {t('dev.photoCurrent', { count: maxPhotosPerPerson })}
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
                {t('dev.viewDocs')}
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                {t('dev.docsNote')}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                {t('dev.foodQuiz.title')}
              </Text>
              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.description}>
                {t('dev.foodQuiz.description')}
              </Text>

              <Button
                mode="contained"
                onPress={() => router.push('/food-quiz')}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                icon="food-apple"
              >
                {t('dev.foodQuiz.button')}
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                {t('dev.foodQuiz.note')}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                {t('dev.partyPlanner.title')}
              </Text>
              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.description}>
                {t('dev.partyPlanner.description')}
              </Text>

              <Button
                mode="contained"
                onPress={() => router.push('/party-planner')}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                icon="party-popper"
              >
                {t('dev.partyPlanner.button')}
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                {t('dev.partyPlanner.note')}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                {t('dev.myPreferences.title')}
              </Text>
              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.description}>
                {t('dev.myPreferences.description')}
              </Text>

              <Button
                mode="contained"
                onPress={() => {
                  if (mePerson) {
                    router.push(`/person/${mePerson.id}`);
                  } else {
                    fzAlert(t('dev.myPreferences.notFoundTitle'), t('dev.myPreferences.notFoundMessage'));
                  }
                }}
                style={styles.button}
                icon="account-circle"
              >
                {t('dev.myPreferences.button')}
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                {t('dev.myPreferences.note')}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                {t('dev.resetApp.title')}
              </Text>
              <Divider style={styles.divider} />

              <Button
                mode="outlined"
                onPress={async () => {
                  await resetOnboarding();
                  fzAlert(t('common.success'), t('dev.resetApp.success'));
                }}
                style={styles.button}
                icon="restart"
              >
                {t('dev.resetApp.button')}
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                {t('dev.resetApp.note')}
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
