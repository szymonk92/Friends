import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Chip, Menu } from 'react-native-paper';

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
                                icon="account"
                                onPress={() => setPersonMenuVisible(true)}
                                onClose={filterPersonId ? () => setFilterPersonId(null) : undefined}
                                style={styles.filterChip}
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
                    {eventTypes.map((type) => (
                        <Chip
                            key={type.value}
                            icon={type.icon}
                            onPress={() => setFilterEventType(type.value)}
                            selected={filterEventType === type.value}
                            style={styles.filterChip}
                        >
                            {type.label}
                        </Chip>
                    ))}
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
