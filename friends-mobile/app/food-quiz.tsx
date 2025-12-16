import CenteredContainer from '@/components/CenteredContainer';
import { usePeople } from '@/hooks/usePeople';
import { useCreateRelation, useRelations } from '@/hooks/useRelations';
import { quizLogger } from '@/lib/logger';
import { db, getCurrentUserId } from '@/lib/db';
import { quizDismissals } from '@/lib/db/schema';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { useState, useMemo, useCallback, useRef } from 'react';
import { router } from 'expo-router';
import { Stack } from 'expo-router';
import { Dimensions, LogBox, View, StyleSheet, Animated, PanResponder } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { LIKES, DISLIKES, MEDIUM } from '@/lib/constants/relations';

import QuizCard from '@/components/food-quiz/QuizCard';
import QuizControls from '@/components/food-quiz/QuizControls';
import QuizProgress from '@/components/food-quiz/QuizProgress';
import QuizComplete from '@/components/food-quiz/QuizComplete';

// Suppress reanimated warnings from react-native-paper
LogBox.ignoreLogs(['It looks like you might be using shared value']);

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25;

// Common food items to ask about
const FOOD_QUESTIONS = [
  { item: 'Cilantro', category: 'herb' },
  { item: 'Spicy Food', category: 'taste' },
  { item: 'Seafood', category: 'protein' },
  { item: 'Coffee', category: 'beverage' },
  { item: 'Wine', category: 'beverage' },
  { item: 'Beer', category: 'beverage' },
  { item: 'Garlic', category: 'vegetable' },
  { item: 'Peanuts', category: 'nuts' },
  { item: 'Dairy', category: 'food_group' },
  { item: 'Gluten', category: 'food_group' },
] as const;

// Pre-compute food item names for efficient lookup
const FOOD_ITEM_SET = new Set(FOOD_QUESTIONS.map((q) => q.item));

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
      if (FOOD_ITEM_SET.has(relation.objectLabel as (typeof FOOD_QUESTIONS)[number]['item'])) {
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

    const questions: Array<{
      person: (typeof primaryPeople)[0];
      food: (typeof FOOD_QUESTIONS)[number];
    }> = [];

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
  const [savedCount, setSavedCount] = useState({ likes: 0, dislikes: 0, skipped: 0 });
  const [isComplete, setIsComplete] = useState(false);

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
    async (direction: 'left' | 'right' | 'down') => {
      const {
        currentPerson: person,
        currentFood: food,
        currentQuestionIndex: qIndex,
      } = stateRef.current;
      if (!person || !food) return;

      const isSkip = direction === 'down';
      const preference = direction === 'right' ? LIKES : DISLIKES;

      quizLogger.debug('Answer recorded', {
        person: person.name,
        food: food.item,
        action: isSkip ? 'SKIPPED' : preference,
        questionIndex: qIndex,
      });

      if (isSkip) {
        // Save dismissal to database immediately
        saveDismissal.mutate({ personId: person.id, questionKey: food.item });
        setSavedCount((prev) => ({ ...prev, skipped: prev.skipped + 1 }));
      } else {
        // Save LIKES or DISLIKES to database immediately
        try {
          await createRelation.mutateAsync({
            subjectId: person.id,
            relationType: preference,
            objectLabel: food.item,
            category: food.category,
            confidence: 0.7,
            source: 'question_mode',
            intensity: MEDIUM,
          });
          setSavedCount((prev) => ({
            ...prev,
            likes: preference === LIKES ? prev.likes + 1 : prev.likes,
            dislikes: preference === DISLIKES ? prev.dislikes + 1 : prev.dislikes,
          }));
          quizLogger.info('Saved relation immediately', {
            person: person.name,
            preference,
            item: food.item,
          });
        } catch (error) {
          quizLogger.error('Failed to save relation', {
            person: person.name,
            preference,
            item: food.item,
            error: error instanceof Error ? error.message : String(error),
          });
        }
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
    [questionsToAsk.length, saveDismissal, createRelation]
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
        <CenteredContainer style={styles.centered}>
          <Text variant="titleLarge">No Primary People</Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Add some primary people first to use the food quiz.
          </Text>
          <Button mode="contained" onPress={() => router.back()}>
            Go Back
          </Button>
        </CenteredContainer>
      </>
    );
  }

  if (questionsToAsk.length === 0 && !isComplete) {
    return (
      <>
        <Stack.Screen options={{ title: 'Food Quiz' }} />
        <CenteredContainer style={styles.centered}>
          <Text style={styles.completeIcon}>✅</Text>
          <Text variant="titleLarge">All Questions Answered!</Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            You've already answered all food preference questions for your people.
          </Text>
          <Button mode="contained" onPress={() => router.back()}>
            Go Back
          </Button>
        </CenteredContainer>
      </>
    );
  }

  if (isComplete) {
    return <QuizComplete savedCount={savedCount} />;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Food Quiz' }} />
      <View style={styles.container}>
        <QuizProgress
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={totalQuestions}
          progress={progress}
          currentPerson={currentPerson}
        />

        <CenteredContainer style={styles.cardContainer}>
          <QuizCard
            currentPerson={currentPerson}
            currentFood={currentFood}
            position={position}
            panHandlers={panResponder.panHandlers}
            cardRotate={cardRotate}
            cardOpacity={cardOpacity}
            likeOpacity={likeOpacity}
            dislikeOpacity={dislikeOpacity}
            skipOpacity={skipOpacity}
          />
        </CenteredContainer>

        <QuizControls onSwipe={swipeCard} />
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
    padding: 24,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 16,
    opacity: 0.7,
  },
  cardContainer: {
    alignItems: 'center',
  },
  completeIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
});
