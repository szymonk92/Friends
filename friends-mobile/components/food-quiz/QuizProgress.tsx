import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { getInitials } from '@/lib/utils/format';

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
    return (
        <View>
            <View style={styles.progressContainer}>
                <Text variant="bodySmall" style={styles.progressText}>
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                </Text>
                <ProgressBar progress={progress} style={styles.progressBar} />
            </View>

            <View style={styles.personInfo}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(currentPerson?.name || '')}</Text>
                </View>
                <Text variant="titleLarge">{currentPerson?.name}</Text>
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
        alignItems: 'center',
        marginBottom: 8,
        justifyContent: 'center',
    },
    avatarText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
});
