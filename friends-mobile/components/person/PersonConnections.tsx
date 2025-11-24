import { StyleSheet, View, Image } from 'react-native';
import { Text, Chip, Button, IconButton, List, ActivityIndicator, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { usePersonConnections } from '@/hooks/useConnections';
import { usePeople } from '@/hooks/usePeople';
import { getInitials } from '@/lib/utils/format';

interface PersonConnectionsProps {
    personId: string;
    personName: string;
}

export default function PersonConnections({ personId, personName }: PersonConnectionsProps) {
    const theme = useTheme();
    const { data: personConnections, isLoading: connectionsLoading } = usePersonConnections(personId);
    const { data: allPeople = [] } = usePeople();

    const getConnectedPerson = (connection: any) => {
        const connectedId =
            connection.person1Id === personId ? connection.person2Id : connection.person1Id;
        return allPeople.find((p) => p.id === connectedId);
    };

    return (
        <View style={[styles.section, { borderBottomColor: theme.colors.surfaceVariant }]}>
            <View style={styles.sectionHeader}>
                <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Connections ({personConnections?.length || 0})
                </Text>
                <View style={styles.sectionHeaderButtons}>
                    <IconButton
                        icon="plus"
                        size={20}
                        onPress={() => router.push(`/person/add-connection?personId=${personId}`)}
                    />
                    <IconButton
                        icon="dots-vertical"
                        size={20}
                        onPress={() => router.push(`/person/manage-connections?personId=${personId}`)}
                    />
                </View>
            </View>

            {connectionsLoading && (
                <View style={styles.centered}>
                    <ActivityIndicator />
                </View>
            )}

            {!connectionsLoading && personConnections && personConnections.length === 0 && (
                <View style={styles.emptyState}>
                    <Text variant="bodyMedium" style={[styles.emptyStateText, { color: theme.colors.onSurfaceVariant }]}>
                        No connections yet. Add connections to show how {personName} relates to other
                        people.
                    </Text>
                    <Button
                        mode="outlined"
                        onPress={() => router.push(`/person/add-connection?personId=${personId}`)}
                        style={styles.emptyStateButton}
                    >
                        Add Connection
                    </Button>
                </View>
            )}

            {personConnections &&
                personConnections.map((connection) => {
                    const connectedPerson = getConnectedPerson(connection);
                    if (!connectedPerson) return null;

                    return (
                        <List.Item
                            key={connection.id}
                            title={connectedPerson.name}
                            description={`${connection.relationshipType}${connection.qualifier ? ` • ${connection.qualifier}` : ''}${connection.status !== 'active' ? ` • ${connection.status}` : ''}`}
                            left={() =>
                                connectedPerson.photoPath ? (
                                    <Image
                                        source={{ uri: connectedPerson.photoPath }}
                                        style={styles.connectionPhoto}
                                    />
                                ) : (
                                    <View style={[styles.connectionAvatar, { backgroundColor: theme.colors.secondary }]}>
                                        <Text style={[styles.connectionAvatarText, { color: theme.colors.onSecondary }]}>
                                            {getInitials(connectedPerson.name)}
                                        </Text>
                                    </View>
                                )
                            }
                            right={() => (
                                <Chip compact style={{ marginRight: 4 }}>
                                    {connection.status}
                                </Chip>
                            )}
                            onPress={() => router.push(`/person/${connectedPerson.id}`)}
                            style={styles.connectionItem}
                        />
                    );
                })}

            {personConnections && personConnections.length > 0 && (
                <Button
                    mode="contained"
                    icon="plus"
                    onPress={() => router.push(`/person/add-connection?personId=${personId}`)}
                    style={styles.addButton}
                >
                    Add Connection
                </Button>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderBottomWidth: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionHeaderButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionTitle: {
        fontWeight: '600',
        fontSize: 18,
    },
    centered: {
        padding: 20,
        alignItems: 'center',
    },
    emptyState: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    emptyStateText: {
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 12,
    },
    emptyStateButton: {
        marginTop: 8,
    },
    connectionItem: {
        paddingVertical: 8,
    },
    connectionAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    connectionPhoto: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginLeft: 8,
    },
    connectionAvatarText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    addButton: {
        marginTop: 16,
    },
});
