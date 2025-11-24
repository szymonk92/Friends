import React from 'react';
import { View, StyleSheet } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

interface QuizControlsProps {
    onSwipe: (direction: 'left' | 'right' | 'down') => void;
}

export default function QuizControls({ onSwipe }: QuizControlsProps) {
    return (
        <View>
            <View style={styles.controls}>
                <IconButton
                    icon="thumb-down"
                    size={40}
                    iconColor="#f44336"
                    style={[styles.controlButton, styles.dislikeButton]}
                    onPress={() => onSwipe('left')}
                />
                <IconButton
                    icon="help-circle"
                    size={32}
                    iconColor="#9e9e9e"
                    style={[styles.controlButton, styles.skipButton]}
                    onPress={() => onSwipe('down')}
                />
                <IconButton
                    icon="thumb-up"
                    size={40}
                    iconColor="#4caf50"
                    style={[styles.controlButton, styles.likeButton]}
                    onPress={() => onSwipe('right')}
                />
            </View>
            <Text variant="bodySmall" style={styles.instructions}>
                Swipe right = Likes • Swipe left = Dislikes • Swipe down = IDK
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        marginBottom: 16,
        justifyContent: 'center',
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
});
