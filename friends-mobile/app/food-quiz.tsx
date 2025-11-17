import { useState, useRef } from 'react';
import { StyleSheet, View, Animated, PanResponder, Dimensions, Alert } from 'react-native';
import { Text, Button, Card, Chip, ProgressBar, IconButton } from 'react-native-paper';
import { Stack, router } from 'expo-router';
import { usePeople } from '@/hooks/usePeople';
import { useCreateRelation } from '@/hooks/useRelations';
import { getInitials } from '@/lib/utils/format';

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
];

interface Answer {
  personId: string;
  personName: string;
  item: string;
  category: string;
  preference: 'LIKES' | 'DISLIKES' | 'skip';
}

export default function FoodQuizScreen() {
  const { data: allPeople = [] } = usePeople();
  const createRelation = useCreateRelation();

  // Filter only primary people
  const primaryPeople = allPeople.filter((p) => p.personType === 'primary');

  const [currentPersonIndex, setCurrentPersonIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const position = useRef(new Animated.ValueXY()).current;

  const currentPerson = primaryPeople[currentPersonIndex];
  const currentQuestion = FOOD_QUESTIONS[currentQuestionIndex];

  const totalQuestions = primaryPeople.length * FOOD_QUESTIONS.length;
  const completedQuestions = currentPersonIndex * FOOD_QUESTIONS.length + currentQuestionIndex;
  const progress = totalQuestions > 0 ? completedQuestions / totalQuestions : 0;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          // Swipe right = LIKES
          swipeCard('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          // Swipe left = DISLIKES
          swipeCard('left');
        } else if (gesture.dy > SWIPE_THRESHOLD) {
          // Swipe down = SKIP/IDK
          swipeCard('down');
        } else {
          // Reset position
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const swipeCard = (direction: 'left' | 'right' | 'down') => {
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
  };

  const recordAnswer = (direction: 'left' | 'right' | 'down') => {
    if (!currentPerson || !currentQuestion) return;

    const preference = direction === 'right' ? 'LIKES' : direction === 'left' ? 'DISLIKES' : 'skip';

    // Only record if not skipped
    if (preference !== 'skip') {
      setAnswers((prev) => [
        ...prev,
        {
          personId: currentPerson.id,
          personName: currentPerson.name,
          item: currentQuestion.item,
          category: currentQuestion.category,
          preference,
        },
      ]);
    }

    // Move to next question
    if (currentQuestionIndex < FOOD_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentPersonIndex < primaryPeople.length - 1) {
      // Next person
      setCurrentPersonIndex(currentPersonIndex + 1);
      setCurrentQuestionIndex(0);
    } else {
      // Quiz complete
      setIsComplete(true);
    }
  };

  const handleSaveAnswers = async () => {
    setIsSaving(true);
    let saved = 0;
    let failed = 0;

    for (const answer of answers) {
      try {
        await createRelation.mutateAsync({
          subjectId: answer.personId,
          relationType: answer.preference as 'LIKES' | 'DISLIKES',
          objectLabel: answer.item,
          category: answer.category,
          confidence: 0.7, // User-provided via quiz
          source: 'question_mode',
          intensity: 'medium',
        });
        saved++;
      } catch (error) {
        console.error(`Failed to save ${answer.personName} ${answer.preference} ${answer.item}:`, error);
        failed++;
      }
    }

    setIsSaving(false);
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
            You answered questions for {primaryPeople.length} people.
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
            Person {currentPersonIndex + 1} of {primaryPeople.length} • Question{' '}
            {currentQuestionIndex + 1} of {FOOD_QUESTIONS.length}
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
                  {currentQuestion?.item}?
                </Text>
                <Chip style={styles.categoryChip}>{currentQuestion?.category}</Chip>
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
