import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, Divider, TextInput } from 'react-native-paper';
import { router, Stack } from 'expo-router';
import { seedSampleData, clearAllData } from '@/lib/db/seed';
import { seedTestData, clearTestData } from '@/scripts/seedTestData';
import { resetOnboarding } from './onboarding';
import { useMePerson } from '@/hooks/usePeople';
import { useState } from 'react';
import {
  testPromptGeneration,
  runMockEvaluation,
  generateComparisonReport,
} from '@/lib/ai/dev-tools/test-prompts';

/**
 * Development utilities screen
 * Access via /dev route
 */
export default function DevScreen() {
  const { data: mePerson } = useMePerson();
  const [isLoading, setIsLoading] = useState(false);
  const [loadTestCount, setLoadTestCount] = useState('500');
  const [loadTestResult, setLoadTestResult] = useState<string | null>(null);

  const handleSeedData = async () => {
    setIsLoading(true);
    try {
      await seedSampleData();
      Alert.alert(
        'Success!',
        'Sample data has been added:\n\n• 3 people (Emma, Mike, Sarah)\n• 8 relations\n• 1 story',
        [{ text: 'View People', onPress: () => router.push('/') }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to seed data. Check console for details.');
      console.error(error);
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
              console.error(error);
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
              console.error(error);
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
              console.error(error);
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
        'Prompt Generation Test Complete',
        'All prompt variants have been generated successfully!\n\nCheck the console for detailed token estimates and comparison data.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to run prompt generation test');
      console.error(error);
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
        'Mock Evaluation Complete',
        'All test cases have been evaluated with mock responses!\n\nCheck the console for detailed results.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to run mock evaluation');
      console.error(error);
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
        'Comparison Report Generated',
        'A detailed prompt variant comparison report has been generated.\n\nCheck the console to see the full markdown report with recommendations.'
      );

      // Log the full report to console
      console.log('\n' + report);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate comparison report');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Dev Tools',
          presentation: 'modal',
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>
            Development Tools
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Utilities for testing and development
          </Text>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                Sample Data
              </Text>
              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.description}>
                Add sample people and relations to test the app quickly.
              </Text>

              <Button
                mode="contained"
                onPress={handleSeedData}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
              >
                Seed Sample Data
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                Adds: Emma Rodriguez (friend), Mike Chen (colleague), Sarah Thompson (friend) with
                various relations.
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                High Load Test
              </Text>
              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.description}>
                Generate hundreds of test people with realistic data including diets, likes, dislikes,
                cares about, and connections between people. Perfect for performance testing!
              </Text>

              <TextInput
                mode="outlined"
                label="Number of People"
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
                Generate {loadTestCount} People
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
                Clear Test Data Only
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                Each person gets: random name, job, diet, 3-8 likes, 2-5 dislikes, 2-6 cares about,
                tags, birthday (70% chance), and 2-10 connections to other people.
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                Clear Data
              </Text>
              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.description}>
                Remove all people, relations, and stories from the database.
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
                Clear All Data
              </Button>

              <Text variant="bodySmall" style={styles.warningNote}>
                ⚠️ Warning: This action cannot be undone!
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                AI Prompt Testing
              </Text>
              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.description}>
                Test and evaluate different AI prompt strategies for extracting relationship data from
                stories. Compare token usage and accuracy across multiple prompt variants.
              </Text>

              <Button
                mode="contained"
                onPress={handleTestPromptGeneration}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                icon="flask"
              >
                Test Prompt Generation
              </Button>

              <Button
                mode="contained"
                onPress={handleRunMockEvaluation}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                icon="check-circle"
              >
                Run Mock Evaluation
              </Button>

              <Button
                mode="contained"
                onPress={handleGenerateReport}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                icon="file-document"
              >
                Generate Comparison Report
              </Button>

              <Text variant="bodySmall" style={styles.note}>
                Tests prompt variants (V1-V4) for token efficiency, accuracy, and conflict detection.
                Results are logged to console.
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                Quick Actions
              </Text>
              <Divider style={styles.divider} />

              <Button
                mode="outlined"
                onPress={() => router.push('/')}
                style={styles.button}
                icon="account-group"
              >
                View People
              </Button>

              <Button
                mode="outlined"
                onPress={() => router.push('/story/addStory')}
                style={styles.button}
                icon="text-box-plus"
              >
                Tell a Story
              </Button>

              <Button
                mode="outlined"
                onPress={() => router.push('/modal')}
                style={styles.button}
                icon="account-plus"
              >
                Add Person
              </Button>
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
