import { View, StyleSheet } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

interface QuizControlsProps {
  onSwipe: (direction: 'left' | 'right' | 'down') => void;
}

export default function QuizControls({ onSwipe }: QuizControlsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <IconButton
          icon="thumb-down"
          mode="contained"
          containerColor="#ffebee"
          iconColor="#d32f2f"
          size={32}
          onPress={() => onSwipe('left')}
          style={styles.button}
        />
        <Text variant="labelMedium" style={styles.label}>Dislike</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <IconButton
          icon="help"
          mode="contained"
          containerColor="#f5f5f5"
          iconColor="#757575"
          size={24}
          onPress={() => onSwipe('down')}
          style={styles.smallButton}
        />
        <Text variant="labelMedium" style={styles.label}>Skip</Text>
      </View>

      <View style={styles.buttonContainer}>
        <IconButton
          icon="thumb-up"
          mode="contained"
          containerColor="#e8f5e9"
          iconColor="#2e7d32"
          size={32}
          onPress={() => onSwipe('right')}
          style={styles.button}
        />
        <Text variant="labelMedium" style={styles.label}>Like</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingBottom: 40,
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
  label: {
    opacity: 0.6,
  }
});
