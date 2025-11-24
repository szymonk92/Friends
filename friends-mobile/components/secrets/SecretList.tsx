import { View, FlatList, StyleSheet } from 'react-native';
import { Card, Text, Chip, ActivityIndicator, IconButton, FAB } from 'react-native-paper';
import { formatRelativeTime } from '@/lib/utils/format';
import { getBiometricTypeName } from '@/lib/crypto/biometric-secrets';

interface SecretListProps {
    secrets: any[];
    loadingSecrets: boolean;
    isPasswordBased: boolean;
    biometricStatus: any;
    people: any[];
    handleViewSecret: (id: string) => void;
    handleDeleteSecret: (id: string, title: string) => void;
    setShowCreateDialog: (show: boolean) => void;
    insets: any;
}

export default function SecretList({
    secrets,
    loadingSecrets,
    isPasswordBased,
    biometricStatus,
    people,
    handleViewSecret,
    handleDeleteSecret,
    setShowCreateDialog,
    insets,
}: SecretListProps) {
    return (
        <View style={styles.container}>
            <Card style={styles.statusCard}>
                <Card.Content style={styles.statusContent}>
                    <Chip icon="shield-lock" style={styles.statusChip}>
                        Protected by {isPasswordBased ? 'Password' : getBiometricTypeName(biometricStatus?.biometricType || 'none')}
                    </Chip>
                    <Text variant="bodySmall" style={styles.statusText}>
                        {secrets.length} secret(s) stored
                    </Text>
                </Card.Content>
            </Card>

            {loadingSecrets ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="small" />
                </View>
            ) : secrets.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text variant="titleMedium" style={styles.emptyTitle}>
                        No Secrets Yet
                    </Text>
                    <Text variant="bodyMedium" style={styles.emptyText}>
                        Tap the + button to add your first secret
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={secrets}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => {
                        const associatedPerson = item.personId
                            ? people.find((p) => p.id === item.personId)
                            : null;
                        return (
                            <Card style={styles.secretCard} onPress={() => handleViewSecret(item.id)}>
                                <Card.Content style={styles.secretCardContent}>
                                    <View style={styles.secretInfo}>
                                        <Text variant="titleMedium">{item.title}</Text>
                                        {associatedPerson && (
                                            <Text variant="bodySmall" style={styles.personTag}>
                                                {associatedPerson.name}
                                            </Text>
                                        )}
                                        <Text variant="bodySmall" style={styles.secretDate}>
                                            {formatRelativeTime(new Date(item.createdAt))}
                                        </Text>
                                    </View>
                                    <IconButton
                                        icon="delete"
                                        size={20}
                                        onPress={() => handleDeleteSecret(item.id, item.title)}
                                    />
                                </Card.Content>
                            </Card>
                        );
                    }}
                />
            )}

            <FAB
                icon="plus"
                style={[styles.fab, { bottom: insets.bottom + 16 }]}
                onPress={() => setShowCreateDialog(true)}
                label="Add Secret"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    statusCard: {
        margin: 16,
        marginBottom: 8,
    },
    statusContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusChip: {
        backgroundColor: '#e8f5e9',
    },
    statusText: {
        opacity: 0.7,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        marginBottom: 8,
    },
    emptyText: {
        opacity: 0.6,
        textAlign: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    secretCard: {
        marginBottom: 12,
    },
    secretCardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    secretInfo: {
        flex: 1,
    },
    secretDate: {
        opacity: 0.6,
        marginTop: 4,
    },
    personTag: {
        color: '#6200ee',
        marginTop: 2,
        fontWeight: '500',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
    },
});
