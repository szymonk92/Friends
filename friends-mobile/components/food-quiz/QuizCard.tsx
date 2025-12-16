import { StyleSheet, Animated, Dimensions } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';

const { width, height } = Dimensions.get('window');

interface QuizCardProps {
  currentPerson: any;
  currentFood: any;
  position: Animated.ValueXY;
  panHandlers: any;
  cardRotate: any;
  cardOpacity: any;
  likeOpacity: any;
  dislikeOpacity: any;
  skipOpacity: any;
}

export default function QuizCard({
  currentPerson,
  currentFood,
  position,
  panHandlers,
  cardRotate,
  cardOpacity,
  likeOpacity,
  dislikeOpacity,
  skipOpacity,
}: QuizCardProps) {
  return (
    <Animated.View
      style={[
        styles.swipeCard,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate: cardRotate },
          ],
          opacity: cardOpacity,
        },
      ]}
      {...panHandlers}
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
  );
}

const styles = StyleSheet.create({
  swipeCard: {
    width: width - 48,
    height: height * 0.4,
    position: 'absolute',
  },
  questionCard: {
    flex: 1,
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
});
