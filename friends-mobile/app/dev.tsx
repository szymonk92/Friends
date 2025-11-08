import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, Divider } from 'react-native-paper';
import { router, Stack } from 'expo-router';
import { seedSampleData, clearAllData } from '@/lib/db/seed';
import { useState } from 'react';

/**
 * Development utilities screen
 * Access via /dev route
 */
export default function DevScreen() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSeedData = async () => {
    setIsLoading(true);
    try {
      await seedSampleData();
      Alert.alert(
        'Success!',
        'Sample data has been added:\n\n• 3 people (Emma, Mike, Sarah)\n• 8 relations\n• 1 story',
        [{ text: 'View People', onPress: () => router.push('/(tabs)/') }]
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
                Quick Actions
              </Text>
              <Divider style={styles.divider} />

              <Button
                mode="outlined"
                onPress={() => router.push('/(tabs)/')}
                style={styles.button}
                icon="account-group"
              >
                View People
              </Button>

              <Button
                mode="outlined"
                onPress={() => router.push('/(tabs)/two')}
                style={styles.button}
                icon="text-box-plus"
              >
                Add Story
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
  note: {
    opacity: 0.7,
    fontStyle: 'italic',
  },
  warningNote: {
    color: '#d32f2f',
    fontStyle: 'italic',
  },
});
