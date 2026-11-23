import { View, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import CenteredContainer from '@/components/CenteredContainer';
import { fz, fzText } from '@/lib/design/tokens';
import { Pill } from '@/components/Pill';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useTranslation } from 'react-i18next';

interface QuizCompleteProps {
  savedCount: {
    likes: number;
    dislikes: number;
    skipped: number;
  };
}

export default function QuizComplete({ savedCount }: QuizCompleteProps) {
  const { t } = useTranslation();
  const totalSaved = savedCount.likes + savedCount.dislikes;

  return (
    <>
      <AppBar title={t('foodQuiz.completeTitle')} />
      <CenteredContainer style={styles.centered}>
        <Text style={styles.completeIcon}>🎉</Text>
        <Text style={[fzText.titleLg, styles.completeTitle]}>
          {t('foodQuiz.completeBang')}
        </Text>
        <Text style={[fzText.body, styles.completeSummary]}>
          {t('foodQuiz.saved', { count: totalSaved })}
        </Text>
        <Text style={[fzText.label, styles.statsTitle]}>
          {t('foodQuiz.results')}
        </Text>
        <View style={styles.statsContainer}>
          <Pill label={t('foodQuiz.likesCount', { count: savedCount.likes })} />
          <Pill label={t('foodQuiz.dislikesCount', { count: savedCount.dislikes })} />
          <Pill label={t('foodQuiz.skippedCount', { count: savedCount.skipped })} />
        </View>

        <PrimaryButton label={t('connectionForm.done')} onPress={() => router.back()} style={styles.saveButton} />
      </CenteredContainer>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    padding: 24,
    backgroundColor: fz.paper,
  },
  completeIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  completeTitle: {
    marginBottom: 8,
  },
  completeSummary: {
    textAlign: 'center',
    marginBottom: 24,
  },
  statsTitle: {
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 32,
  },
  saveButton: {
    marginBottom: 12,
    minWidth: 250,
  },
});
