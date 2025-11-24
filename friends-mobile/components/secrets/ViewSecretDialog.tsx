import { StyleSheet } from 'react-native';
import { Dialog, Text, Button } from 'react-native-paper';

interface ViewSecretDialogProps {
    visible: boolean;
    onDismiss: () => void;
    viewedSecret: { title: string; content: string } | null;
    remainingTime: number;
}

export default function ViewSecretDialog({
    visible,
    onDismiss,
    viewedSecret,
    remainingTime,
}: ViewSecretDialogProps) {
    return (
        <Dialog visible={visible} onDismiss={onDismiss}>
            <Dialog.Title>{viewedSecret?.title || 'Secret'}</Dialog.Title>
            <Dialog.Content>
                <Text variant="bodySmall" style={styles.securityTimer}>
                    Auto-closing in {remainingTime}s for security
                </Text>
                <Text variant="bodyMedium" style={styles.secretContent}>
                    {viewedSecret?.content}
                </Text>
            </Dialog.Content>
            <Dialog.Actions>
                <Button onPress={onDismiss}>Close</Button>
            </Dialog.Actions>
        </Dialog>
    );
}

const styles = StyleSheet.create({
    securityTimer: {
        color: '#ff5722',
        marginBottom: 12,
    },
    secretContent: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        fontFamily: 'monospace',
    },
});
