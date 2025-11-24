import { StyleSheet, View } from 'react-native';
import { Text, Chip, Button, IconButton, ActivityIndicator, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { usePersonRelations } from '@/hooks/useRelations';
import { formatRelationType, getRelationEmoji } from '@/lib/utils/format';
import { WEAK, MEDIUM, STRONG, VERY_STRONG } from '@/lib/constants/relations';

// Priority order for relation types (higher priority = shown first)
const RELATION_TYPE_PRIORITY: Record<string, number> = {
    CARES_FOR: 100,
    DEPENDS_ON: 95,
    STRUGGLES_WITH: 90,
    FEARS: 85,
    WANTS_TO_ACHIEVE: 80,
    IS: 75,
    HAS_SKILL: 70,
    REGULARLY_DOES: 65,
    KNOWS: 60,
    BELIEVES: 55,
    LIKES: 50,
    PREFERS_OVER: 45,
    ASSOCIATED_WITH: 40,
    EXPERIENCED: 35,
    OWNS: 30,
    UNCOMFORTABLE_WITH: 25,
    SENSITIVE_TO: 20,
    DISLIKES: 10,
    USED_TO_BE: 5,
    UNKNOWN: 0,
};

interface PersonRelationsProps {
    personId: string;
    personName: string;
}

export default function PersonRelations({ personId, personName }: PersonRelationsProps) {
    const theme = useTheme();
    const { data: personRelations, isLoading: relationsLoading } = usePersonRelations(personId);

    // Group relations by type and sort by priority
    const relationsByType = personRelations?.reduce(
        (acc, relation) => {
            const type = relation.relationType;
            if (!acc[type]) acc[type] = [];
            acc[type].push(relation);
            return acc;
        },
        {} as Record<string, typeof personRelations>
    );

    // Sort relation types by priority (higher priority first)
    const sortedRelationTypes = relationsByType
        ? Object.keys(relationsByType).sort(
            (a, b) => (RELATION_TYPE_PRIORITY[b] || 0) - (RELATION_TYPE_PRIORITY[a] || 0)
        )
        : [];

    return (
        <View style={[styles.section, { borderBottomColor: theme.colors.surfaceVariant }]}>
            <View style={styles.sectionHeader}>
                <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Relations ({personRelations?.length || 0})
                </Text>
                <View style={styles.sectionHeaderButtons}>
                    <IconButton
                        icon="plus"
                        size={20}
                        onPress={() => router.push(`/person/add-relation?personId=${personId}`)}
                    />
                    <IconButton
                        icon="dots-vertical"
                        size={20}
                        onPress={() => router.push(`/person/manage-relations?personId=${personId}`)}
                    />
                </View>
            </View>

            {relationsLoading && (
                <View style={styles.centered}>
                    <ActivityIndicator />
                </View>
            )}

            {!relationsLoading && personRelations && personRelations.length === 0 && (
                <View style={styles.emptyState}>
                    <Text variant="bodyMedium" style={[styles.emptyStateText, { color: theme.colors.onSurfaceVariant }]}>
                        No relations yet. Add preferences, facts, or information about {personName}.
                    </Text>
                    <Button
                        mode="outlined"
                        icon="plus"
                        onPress={() => router.push(`/person/add-relation?personId=${personId}`)}
                        style={styles.emptyStateButton}
                    >
                        Add Relation
                    </Button>
                </View>
            )}

            {/* Compact relations list sorted by priority */}
            {sortedRelationTypes.map((type) => {
                const rels = relationsByType![type];
                return (
                    <View key={type} style={styles.relationTypeSection}>
                        <Text variant="labelLarge" style={[styles.relationTypeLabel, { color: theme.colors.onSurface }]}>
                            {getRelationEmoji(type)} {formatRelationType(type)}
                        </Text>
                        <View style={styles.relationChipsContainer}>
                            {rels.map((relation) => (
                                <Chip
                                    key={relation.id}
                                    style={styles.relationChip}
                                    textStyle={styles.relationChipText}
                                >
                                    {relation.objectLabel}
                                    {relation.intensity && relation.intensity !== 'medium' && (
                                        <Text style={[styles.intensityIndicator, { color: theme.colors.onSurfaceVariant }]}>
                                            {' '}
                                            {relation.intensity === VERY_STRONG
                                                ? '💪'
                                                : relation.intensity === STRONG
                                                    ? '+'
                                                    : relation.intensity === WEAK
                                                        ? '-'
                                                        : ''}
                                        </Text>
                                    )}
                                </Chip>
                            ))}
                        </View>
                    </View>
                );
            })}
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
    relationTypeSection: {
        marginBottom: 12,
    },
    relationTypeLabel: {
        marginBottom: 6,
        opacity: 0.8,
    },
    relationChipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    relationChip: {
        marginBottom: 2,
    },
    relationChipText: {
        fontSize: 12,
    },
    intensityIndicator: {
        fontSize: 10,
        opacity: 0.8,
    },
});
