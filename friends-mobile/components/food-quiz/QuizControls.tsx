import { View, StyleSheet, Text } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fz, fzText } from '@/lib/design/tokens';
import { useTranslation } from 'react-i18next';

interface QuizControlsProps {
  onSwipe: (direction: 'left' | 'right' | 'down') => void;
}

export default function QuizControls({ onSwipe }: QuizControlsProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.buttonContainer}>
        <IconButton
          icon="thumb-down"
          mode="contained"
          containerColor={fz.dangerBg}
          iconColor={fz.danger}
          size={32}
          onPress={() => onSwipe('left')}
          style={styles.button}
        />
        <Text style={fzText.meta}>{t('foodQuiz.dislike')}</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <IconButton
          icon="help"
          mode="contained"
          containerColor={fz.surfaceSoft}
          iconColor={fz.textBody}
          size={24}
          onPress={() => onSwipe('down')}
          style={styles.smallButton}
        />
        <Text style={fzText.meta}>{t('foodQuiz.skip')}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <IconButton
          icon="thumb-up"
          mode="contained"
          containerColor={fz.successBg}
          iconColor={fz.success}
          size={32}
          onPress={() => onSwipe('right')}
          style={styles.button}
        />
        <Text style={fzText.meta}>{t('foodQuiz.like')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 32,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  buttonContainer: {
    alignItems: 'center',
    gap: 4,
  },
  button: {
    margin: 0,
    width: 64,
    height: 64,
  },
  smallButton: {
    margin: 0,
    width: 48,
    height: 48,
    marginBottom: 8,
  },
});
