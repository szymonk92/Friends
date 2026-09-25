import { StyleSheet, Animated, Dimensions, View } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { QuestionIcon, ForkKnifeIcon } from 'phosphor-react-native';
import { RelationIcon } from '@/components/RelationIcon';
import { LIKES, DISLIKES } from '@/lib/constants/relations';
import { fz } from '@/lib/design/tokens';

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
        <View style={styles.overlayBadge}>
          <Text style={styles.overlayText}>LIKES</Text>
          <RelationIcon type={LIKES} size={28} />
        </View>
      </Animated.View>

      <Animated.View style={[styles.dislikeOverlay, { opacity: dislikeOpacity }]}>
        <View style={styles.overlayBadge}>
          <Text style={styles.overlayText}>DISLIKES</Text>
          <RelationIcon type={DISLIKES} size={28} />
        </View>
      </Animated.View>

      <Animated.View style={[styles.skipOverlay, { opacity: skipOpacity }]}>
        <View style={styles.overlayBadge}>
          <Text style={styles.overlayText}>IDK</Text>
          <QuestionIcon size={28} color="#1B1815" weight="bold" />
        </View>
      </Animated.View>

      <Card style={styles.questionCard}>
        <Card.Content style={styles.questionContent}>
          <ForkKnifeIcon size={40} color="#1B1815" weight="bold" style={styles.foodIcon} />
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
    backgroundColor: fz.card,
    borderRadius: fz.rCard,
  },
  questionContent: {
    alignItems: 'center',
    padding: 24,
  },
  foodIcon: {
    marginBottom: 16,
  },
  questionText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  foodItem: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: fz.ink,
    marginBottom: 16,
  },
  categoryChip: {
    marginTop: 8,
    borderRadius: fz.rPill,
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
  overlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 4,
    borderRadius: fz.rButton,
    padding: 8,
    backgroundColor: fz.card,
  },
  overlayText: {
    fontFamily: fz.font,
    fontSize: 32,
    fontWeight: 'bold',
    color: fz.ink,
  },
});
