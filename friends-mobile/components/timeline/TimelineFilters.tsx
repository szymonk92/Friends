import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Chip, Menu, useTheme, Icon } from 'react-native-paper';

interface TimelineFiltersProps {
    filtersVisible: boolean;
    filterPersonId: string | null;
    setFilterPersonId: (id: string | null) => void;
    filterEventType: string | null;
    setFilterEventType: (type: string | null) => void;
    personMenuVisible: boolean;
    setPersonMenuVisible: (visible: boolean) => void;
    people: any[];
    eventTypes: any[];
    getPersonName: (id: string) => string;
}

export default function TimelineFilters({
    filtersVisible,
    filterPersonId,
    setFilterPersonId,
    filterEventType,
    setFilterEventType,
    personMenuVisible,
    setPersonMenuVisible,
    people,
    eventTypes,
    getPersonName,
}: TimelineFiltersProps) {
    const theme = useTheme();

    // Sort event types to move selected to the front
    const sortedEventTypes = useMemo(() => {
        if (!filterEventType) return eventTypes;

        const selected = eventTypes.find(t => t.value === filterEventType);
        const others = eventTypes.filter(t => t.value !== filterEventType);

        return selected ? [selected, ...others] : eventTypes;
    }, [eventTypes, filterEventType]);

    if (!filtersVisible) return null;

    return (
        <View style={styles.filtersSection}>
            <View style={styles.filtersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                    {/* Person filter */}
                    <Menu
                        visible={personMenuVisible}
                        onDismiss={() => setPersonMenuVisible(false)}
                        anchor={
                            <Chip
                                icon={({ size, color }) => (
                                    <Icon
                                        source="account"
                                        size={size}
                                        color={filterPersonId ? theme.colors.onPrimary : color}
                                    />
                                )}
                                onPress={() => setPersonMenuVisible(true)}
                                onClose={filterPersonId ? () => setFilterPersonId(null) : undefined}
                                selected={!!filterPersonId}
                                style={[
                                    styles.filterChip,
                                    filterPersonId ? { backgroundColor: theme.colors.primary } : null
                                ]}
                                selectedColor={filterPersonId ? theme.colors.onPrimary : undefined}
                            >
                                {filterPersonId ? getPersonName(filterPersonId) : 'All People'}
                            </Chip>
                        }
                    >
                        <Menu.Item
                            onPress={() => {
                                setFilterPersonId(null);
                                setPersonMenuVisible(false);
                            }}
                            title="All People"
                        />
                        {people.map((person) => (
                            <Menu.Item
                                key={person.id}
                                onPress={() => {
                                    setFilterPersonId(person.id);
                                    setPersonMenuVisible(false);
                                }}
                                title={person.name}
                            />
                        ))}
                    </Menu>

                    {/* Event type filters */}
                    <Chip
                        icon="filter-variant"
                        onPress={() => setFilterEventType(null)}
                        selected={!filterEventType}
                        style={styles.filterChip}
                    >
                        All Types
                    </Chip>
                    {sortedEventTypes.map((type) => {
                        const isSelected = filterEventType === type.value;
                        return (
                            <Chip
                                key={type.value}
                                icon={({ size, color }) => (
                                    <Icon
                                        source={type.icon}
                                        size={size}
                                        color={isSelected ? theme.colors.onPrimary : color}
                                    />
                                )}
                                onPress={() => setFilterEventType(isSelected ? null : type.value)}
                                selected={isSelected}
                                style={[
                                    styles.filterChip,
                                    isSelected && { backgroundColor: theme.colors.primary }
                                ]}
                                selectedColor={isSelected ? theme.colors.onPrimary : undefined}
                                showSelectedOverlay={true}
                            >
                                {type.label}
                            </Chip>
                        );
                    })}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    filtersSection: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    filtersContainer: {
        marginTop: 0,
    },
    filterScroll: {
        flexGrow: 0,
    },
    filterChip: {
        marginRight: 8,
    },
});
