import { View, StyleSheet } from 'react-native';
import { Card, Text, Divider, ActivityIndicator } from 'react-native-paper';

interface DataStatisticsProps {
    stats: any;
    loading: boolean;
}

export default function DataStatistics({ stats, loading }: DataStatisticsProps) {
    return (
        <Card style={styles.card}>
            <Card.Content>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                    Your Data
                </Text>
                <Divider style={styles.divider} />

                {loading ? (
                    <ActivityIndicator />
                ) : (
                    <View style={styles.statsContainer}>
                        <View style={styles.statRow}>
                            <Text variant="bodyMedium">People:</Text>
                            <Text variant="bodyMedium" style={styles.statValue}>
                                {stats?.people || 0}
                            </Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text variant="bodyMedium">Relations:</Text>
                            <Text variant="bodyMedium" style={styles.statValue}>
                                {stats?.relations || 0}
                            </Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text variant="bodyMedium">Connections:</Text>
                            <Text variant="bodyMedium" style={styles.statValue}>
                                {stats?.connections || 0}
                            </Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text variant="bodyMedium">Stories:</Text>
                            <Text variant="bodyMedium" style={styles.statValue}>
                                {stats?.stories || 0}
                            </Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text variant="bodyMedium">Events:</Text>
                            <Text variant="bodyMedium" style={styles.statValue}>
                                {stats?.events || 0}
                            </Text>
                        </View>
                    </View>
                )}
            </Card.Content>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: 16,
        marginHorizontal: 16,
    },
    sectionTitle: {
        marginBottom: 8,
    },
    divider: {
        marginBottom: 16,
    },
    statsContainer: {
        gap: 8,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statValue: {
        fontWeight: 'bold',
    },
});
