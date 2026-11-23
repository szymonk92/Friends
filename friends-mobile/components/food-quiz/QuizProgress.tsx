import { View, StyleSheet, Text } from 'react-native';
import { getInitials } from '@/lib/utils/format';
import { fz, fzText } from '@/lib/design/tokens';
import { useTranslation } from 'react-i18next';

interface QuizProgressProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  progress: number;
  currentPerson: any;
}

export default function QuizProgress({
  currentQuestionIndex,
  totalQuestions,
  progress,
  currentPerson,
}: QuizProgressProps) {
  const { t } = useTranslation();
  return (
    <View>
      <View style={styles.progressContainer}>
        <Text style={[fzText.sub, styles.progressText]}>
          {t('foodQuiz.questionOf', { current: currentQuestionIndex + 1, total: totalQuestions })}
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(1, progress)) * 100}%` }]} />
        </View>
      </View>

      <View style={styles.personInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(currentPerson?.name || '')}</Text>
        </View>
        <Text style={fzText.title}>{currentPerson?.name}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  progressText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: fz.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: fz.ink,
  },
  personInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: fz.ink,
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'center',
  },
  avatarText: {
    color: fz.onInk,
    fontFamily: fz.font,
    fontSize: 24,
    fontWeight: 'bold',
  },
});
