import { useState, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, Animated, PanResponder, Dimensions, Alert } from 'react-native';
import { Text, Button, Card, Chip, ProgressBar, IconButton } from 'react-native-paper';
import { Stack, router } from 'expo-router';
import { usePeople } from '@/hooks/usePeople';
import { useCreateRelation, useRelations } from '@/hooks/useRelations';
import { getInitials } from '@/lib/utils/format';
import { quizLogger, logPerformance } from '@/lib/logger';
import { db, getCurrentUserId } from '@/lib/db';
import { quizDismissals } from '@/lib/db/schema';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25;

// Common food items to ask about
const FOOD_QUESTIONS = [
  { item: 'Tomatoes', category: 'vegetable' },
  { item: 'Mushrooms', category: 'vegetable' },
  { item: 'Cilantro', category: 'herb' },
  { item: 'Spicy Food', category: 'taste' },
  { item: 'Seafood', category: 'protein' },
  { item: 'Sushi', category: 'cuisine' },
  { item: 'Olives', category: 'vegetable' },
  { item: 'Blue Cheese', category: 'dairy' },
  { item: 'Avocado', category: 'fruit' },
  { item: 'Coffee', category: 'beverage' },
  { item: 'Wine', category: 'beverage' },
  { item: 'Beer', category: 'beverage' },
  { item: 'Garlic', category: 'vegetable' },
  { item: 'Onions', category: 'vegetable' },
  { item: 'Chocolate', category: 'dessert' },
  { item: 'Peanuts', category: 'nuts' },
  { item: 'Shellfish', category: 'seafood' },
  { item: 'Eggs', category: 'protein' },
  { item: 'Dairy', category: 'food_group' },
  { item: 'Gluten', category: 'food_group' },
] as const;

// Pre-compute food item names for efficient lookup
const FOOD_ITEM_SET = new Set(FOOD_QUESTIONS.map((q) => q.item));

interface Answer {
  personId: string;
  personName: string;
  item: string;
  category: string;
  preference: 'LIKES' | 'DISLIKES';
}

export default function FoodQuizScreen() {
  const queryClient = useQueryClient();
  const { data: allPeople = [] } = usePeople();
  const { data: existingRelations = [] } = useRelations();
  const createRelation = useCreateRelation();

  // Filter only primary people
  const primaryPeople = allPeople.filter((p) => p.personType === 'primary');

  // Fetch dismissed questions from database
  const { data: dismissedQuestions = [], isLoading: dismissalsLoading } = useQuery({
    queryKey: ['quizDismissals', 'food'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      return db
        .select()
        .from(quizDismissals)
        .where(and(eq(quizDismissals.userId, userId), eq(quizDismissals.quizType, 'food')));
    },
  });

  // Mutation to save a dismissal
  const saveDismissal = useMutation({
    mutationFn: async ({ personId, questionKey }: { personId: string; questionKey: string }) => {
      const userId = await getCurrentUserId();
      await db.insert(quizDismissals).values({
        id: randomUUID(),
        userId,
        personId,
        quizType: 'food',
        questionKey,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizDismissals', 'food'] });
    },
  });

  // Build a set of already-answered questions (person+food combinations)
  // Now checks for ANY relation type, not just LIKES/DISLIKES
  const answeredQuestions = useMemo(() => {
    const answered = new Set<string>();
    for (const relation of existingRelations) {
      // Check if this is a food preference (any relation type) using O(1) Set lookup
      if (FOOD_ITEM_SET.has(relation.objectLabel || '')) {
        answered.add(`${relation.subjectId}:${relation.objectLabel}`);
      }
    }
    return answered;
  }, [existingRelations]);

  // Build set of dismissed questions
  const dismissedSet = useMemo(() => {
    const dismissed = new Set<string>();
    for (const d of dismissedQuestions) {
      dismissed.add(`${d.personId}:${d.questionKey}`);
    }
    return dismissed;
  }, [dismissedQuestions]);

  // Generate list of unanswered questions - MIXED across people
  const questionsToAsk = useMemo(() => {
    if (dismissalsLoading) return [];

    const questions: Array<{ person: (typeof primaryPeople)[0]; food: (typeof FOOD_QUESTIONS)[0] }> =
      [];

    // Create a mixed list: iterate through foods first, then people
    // This ensures we ask about food A for person 1, food A for person 2, etc.
    for (const food of FOOD_QUESTIONS) {
      for (const person of primaryPeople) {
        const key = `${person.id}:${food.item}`;
        // Skip if already answered in DB OR dismissed
        if (!answeredQuestions.has(key) && !dismissedSet.has(key)) {
          questions.push({ person, food });
        }
      }
    }
    return questions;
  }, [primaryPeople, answeredQuestions, dismissedSet, dismissalsLoading]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const position = useRef(new Animated.ValueXY()).current;

  const currentQuestion = questionsToAsk[currentQuestionIndex];
  const currentPerson = currentQuestion?.person;
  const currentFood = currentQuestion?.food;

  const totalQuestions = questionsToAsk.length;
  const progress = totalQuestions > 0 ? currentQuestionIndex / totalQuestions : 0;

  // Use ref to avoid stale closure in panResponder
  const stateRef = useRef({ currentQuestionIndex, currentPerson, currentFood });
  stateRef.current = { currentQuestionIndex, currentPerson, currentFood };

  const recordAnswer = useCallback(
    (direction: 'left' | 'right' | 'down') => {
      const {
        currentPerson: person,
        currentFood: food,
        currentQuestionIndex: qIndex,
      } = stateRef.current;
      if (!person || !food) return;

      const isSkip = direction === 'down';
      const preference: 'LIKES' | 'DISLIKES' = direction === 'right' ? 'LIKES' : 'DISLIKES';

      quizLogger.debug('Answer recorded', {
        person: person.name,
        food: food.item,
        action: isSkip ? 'SKIPPED' : preference,
        questionIndex: qIndex,
      });

      if (isSkip) {
        // Save dismissal to database
        saveDismissal.mutate({ personId: person.id, questionKey: food.item });
      } else {
        // Record LIKES or DISLIKES to save later
        setAnswers((prev) => [
          ...prev,
          {
            personId: person.id,
            personName: person.name,
            item: food.item,
            category: food.category,
            preference,
          },
        ]);
      }

      // Move to next question
      if (qIndex < questionsToAsk.length - 1) {
        setCurrentQuestionIndex(qIndex + 1);
      } else {
        // Quiz complete
        quizLogger.info('Quiz completed', { totalAnswers: qIndex + 1 });
        setIsComplete(true);
      }
    },
    [questionsToAsk.length, saveDismissal]
  );

  const swipeCard = useCallback(
    (direction: 'left' | 'right' | 'down') => {
      const x = direction === 'right' ? width : direction === 'left' ? -width : 0;
      const y = direction === 'down' ? height : 0;

      Animated.timing(position, {
        toValue: { x, y },
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        recordAnswer(direction);
        position.setValue({ x: 0, y: 0 });
      });
    },
    [position, recordAnswer]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gesture) => {
          position.setValue({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_, gesture) => {
          const absX = Math.abs(gesture.dx);
          const absY = Math.abs(gesture.dy);

          // Prioritize down gesture if vertical movement is greater than horizontal
          if (gesture.dy > SWIPE_THRESHOLD && absY > absX) {
            // Swipe down = SKIP/IDK
            swipeCard('down');
          } else if (gesture.dx > SWIPE_THRESHOLD) {
            // Swipe right = LIKES
            swipeCard('right');
          } else if (gesture.dx < -SWIPE_THRESHOLD) {
            // Swipe left = DISLIKES
            swipeCard('left');
          } else {
            // Reset position
            Animated.spring(position, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: false,
            }).start();
          }
        },
      }),
    [position, swipeCard]
  );

  const handleSaveAnswers = async () => {
    const perf = logPerformance(quizLogger, 'saveQuizAnswers');
    quizLogger.info('Saving quiz answers', { totalAnswers: answers.length });

    if (answers.length === 0) {
      Alert.alert('No Answers', 'No preferences to save. All answers were skipped.');
      return;
    }

    setIsSaving(true);
    let saved = 0;
    let failed = 0;

    for (const answer of answers) {
      try {
        quizLogger.debug('Attempting to save', {
          personId: answer.personId,
          item: answer.item,
          preference: answer.preference,
        });

        await createRelation.mutateAsync({
          subjectId: answer.personId,
          relationType: answer.preference,
          objectLabel: answer.item,
          category: answer.category,
          confidence: 0.7, // User-provided via quiz
          source: 'question_mode',
          intensity: 'medium',
        });
        saved++;
        quizLogger.info('Saved relation', {
          person: answer.personName,
          preference: answer.preference,
          item: answer.item,
        });
      } catch (error) {
        quizLogger.error('Failed to save answer', {
          person: answer.personName,
          preference: answer.preference,
          item: answer.item,
          error: error instanceof Error ? error.message : String(error),
        });
        failed++;
      }
    }

    setIsSaving(false);
    perf.end(failed === 0, { saved, failed });

    Alert.alert(
      'Quiz Complete!',
      `Saved ${saved} food preferences.${failed > 0 ? `\n${failed} failed to save.` : ''}`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const cardRotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  const cardOpacity = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: [0.7, 1, 0.7],
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const dislikeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const skipOpacity = position.y.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (primaryPeople.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Food Quiz' }} />
        <View style={styles.centered}>
          <Text variant="titleLarge">No Primary People</Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Add some primary people first to use the food quiz.
          </Text>
          <Button mode="contained" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </>
    );
  }

  if (questionsToAsk.length === 0 && !isComplete) {
    return (
      <>
        <Stack.Screen options={{ title: 'Food Quiz' }} />
        <View style={styles.centered}>
          <Text style={styles.completeIcon}>✅</Text>
          <Text variant="titleLarge">All Questions Answered!</Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            You've already answered all food preference questions for your people.
          </Text>
          <Button mode="contained" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </>
    );
  }

  if (isComplete) {
    return (
      <>
        <Stack.Screen options={{ title: 'Quiz Complete' }} />
        <View style={styles.centered}>
          <Text style={styles.completeIcon}>🎉</Text>
          <Text variant="headlineMedium" style={styles.completeTitle}>
            Quiz Complete!
          </Text>
          <Text variant="bodyLarge" style={styles.completeSummary}>
            You answered {answers.length} questions.
          </Text>
          <Text variant="titleMedium" style={styles.statsTitle}>
            Results:
          </Text>
          <View style={styles.statsContainer}>
            <Chip icon="thumb-up" style={styles.statChip}>
              {answers.filter((a) => a.preference === 'LIKES').length} Likes
            </Chip>
            <Chip icon="thumb-down" style={styles.statChip}>
              {answers.filter((a) => a.preference === 'DISLIKES').length} Dislikes
            </Chip>
          </View>

          <Button
            mode="contained"
            onPress={handleSaveAnswers}
            loading={isSaving}
            disabled={isSaving || answers.length === 0}
            style={styles.saveButton}
            icon="content-save"
          >
            Save {answers.length} Preferences
          </Button>

          <Button mode="outlined" onPress={() => router.back()} style={styles.cancelButton}>
            Cancel
          </Button>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Food Quiz' }} />
      <View style={styles.container}>
        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text variant="bodySmall" style={styles.progressText}>
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </Text>
          <ProgressBar progress={progress} style={styles.progressBar} />
        </View>

        {/* Person info */}
        <View style={styles.personInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(currentPerson?.name || '')}</Text>
          </View>
          <Text variant="titleLarge">{currentPerson?.name}</Text>
        </View>

        {/* Swipeable card */}
        <View style={styles.cardContainer}>
          <Animated.View
            style={[
              styles.swipeCard,
              {
                transform: [{ translateX: position.x }, { translateY: position.y }, { rotate: cardRotate }],
                opacity: cardOpacity,
              },
            ]}
            {...panResponder.panHandlers}
          >
            {/* Overlay indicators */}
            <Animated.View style={[styles.likeOverlay, { opacity: likeOpacity }]}>
              <Text style={styles.overlayText}>LIKES ❤️</Text>
            </Animated.View>

            <Animated.View style={[styles.dislikeOverlay, { opacity: dislikeOpacity }]}>
              <Text style={styles.overlayText}>DISLIKES 👎</Text>
            </Animated.View>

            <Animated.View style={[styles.skipOverlay, { opacity: skipOpacity }]}>
              <Text style={styles.overlayText}>IDK 🤷</Text>
            </Animated.View>

            <Card style={styles.questionCard}>
              <Card.Content style={styles.questionContent}>
                <Text variant="displaySmall" style={styles.foodEmoji}>
                  🍽️
                </Text>
                <Text variant="headlineMedium" style={styles.questionText}>
                  Does {currentPerson?.name?.split(' ')[0]} like
                </Text>
                <Text variant="displaySmall" style={styles.foodItem}>
                  {currentFood?.item}?
                </Text>
                <Chip style={styles.categoryChip}>{currentFood?.category}</Chip>
              </Card.Content>
            </Card>
          </Animated.View>
        </View>

        {/* Button controls */}
        <View style={styles.controls}>
          <IconButton
            icon="thumb-down"
            size={40}
            iconColor="#f44336"
            style={[styles.controlButton, styles.dislikeButton]}
            onPress={() => swipeCard('left')}
          />
          <IconButton
            icon="help-circle"
            size={32}
            iconColor="#9e9e9e"
            style={[styles.controlButton, styles.skipButton]}
            onPress={() => swipeCard('down')}
          />
          <IconButton
            icon="thumb-up"
            size={40}
            iconColor="#4caf50"
            style={[styles.controlButton, styles.likeButton]}
            onPress={() => swipeCard('right')}
          />
        </View>

        <Text variant="bodySmall" style={styles.instructions}>
          Swipe right = Likes • Swipe left = Dislikes • Swipe down = IDK
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 16,
    opacity: 0.7,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  progressText: {
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.7,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  personInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeCard: {
    width: width - 48,
    height: height * 0.4,
    position: 'absolute',
  },
  questionCard: {
    flex: 1,
    justifyContent: 'center',
  },
  questionContent: {
    alignItems: 'center',
    padding: 24,
  },
  foodEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  questionText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  foodItem: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 16,
  },
  categoryChip: {
    marginTop: 8,
  },
  likeOverlay: {
    position: 'absolute',
    top: 50,
    right: 40,
    zIndex: 10,
    transform: [{ rotate: '30deg' }],
  },
  dislikeOverlay: {
    position: 'absolute',
    top: 50,
    left: 40,
    zIndex: 10,
    transform: [{ rotate: '-30deg' }],
  },
  skipOverlay: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    zIndex: 10,
  },
  overlayText: {
    fontSize: 32,
    fontWeight: 'bold',
    borderWidth: 4,
    borderRadius: 8,
    padding: 8,
    backgroundColor: 'white',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginBottom: 16,
  },
  controlButton: {
    borderWidth: 2,
  },
  dislikeButton: {
    borderColor: '#f44336',
    backgroundColor: '#ffebee',
  },
  skipButton: {
    borderColor: '#9e9e9e',
    backgroundColor: '#f5f5f5',
  },
  likeButton: {
    borderColor: '#4caf50',
    backgroundColor: '#e8f5e9',
  },
  instructions: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.6,
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
  cancelButton: {
    minWidth: 250,
  },
});
