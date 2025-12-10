import { View, StyleSheet } from 'react-native';
import { Text, Button, Chip } from 'react-native-paper';
import { router } from 'expo-router';
import { Stack } from 'expo-router';
import CenteredContainer from '@/components/CenteredContainer';

interface QuizCompleteProps {
  savedCount: {
    likes: number;
    dislikes: number;
    skipped: number;
  };
}

export default function QuizComplete({ savedCount }: QuizCompleteProps) {
  const totalSaved = savedCount.likes + savedCount.dislikes;

  return (
    <>
      <Stack.Screen options={{ title: 'Quiz Complete' }} />
      <CenteredContainer style={styles.centered}>
        <Text style={styles.completeIcon}>🎉</Text>
        <Text variant="headlineMedium" style={styles.completeTitle}>
          Quiz Complete!
        </Text>
        <Text variant="bodyLarge" style={styles.completeSummary}>
          Saved {totalSaved} preferences automatically.
        </Text>
        <Text variant="titleMedium" style={styles.statsTitle}>
          Results:
        </Text>
        <View style={styles.statsContainer}>
          <Chip icon="thumb-up" style={styles.statChip}>
            {savedCount.likes} Likes
          </Chip>
          <Chip icon="thumb-down" style={styles.statChip}>
            {savedCount.dislikes} Dislikes
          </Chip>
          <Chip icon="help-circle" style={styles.statChip}>
            {savedCount.skipped} Skipped
          </Chip>
        </View>

        <Button mode="contained" onPress={() => router.back()} style={styles.saveButton}>
          Done
        </Button>
      </CenteredContainer>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    padding: 24,
  },
  completeIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  completeTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  completeSummary: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  statsTitle: {
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  statChip: {
    paddingHorizontal: 8,
  },
  saveButton: {
    marginBottom: 12,
    minWidth: 250,
  },
});
