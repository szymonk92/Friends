import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, IconButton, Menu, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { formatRelativeTime, getInitials } from '@/lib/utils/format';
import SectionDivider from '@/components/SectionDivider';

interface TimelineEventItemProps {
    item: any;
    index: number;
    filteredEvents: any[];
    people: any[];
    relationshipColors: Record<string, string>;
    theme: any;
    eventMenuVisible: string | null;
    setEventMenuVisible: (id: string | null) => void;
    handleEditEvent: (event: any) => void;
    handleDeleteEvent: (id: string) => void;
    getPersonName: (id: string) => string;
    getEventLabel: (type: string) => string;
}

export default function TimelineEventItem({
    item,
    index,
    filteredEvents,
    people,
    relationshipColors,
    theme,
    eventMenuVisible,
    setEventMenuVisible,
    handleEditEvent,
    handleDeleteEvent,
    getPersonName,
    getEventLabel,
}: TimelineEventItemProps) {
    const personName = item.isPartyEvent ? (item.partyDetails?.name || 'Party') : getPersonName(item.personId);
    const person = people.find((p) => p.id === item.personId);
    const isBirthday = item.isBirthday || item.eventType === 'birthday';
    const isImportantDate = item.isImportantDate || item.eventType === 'anniversary';
    const isSpecialEvent = isBirthday || isImportantDate;
    const personColor = person?.relationshipType
        ? relationshipColors[person.relationshipType] || theme.colors.primary
        : theme.colors.primary;

    // Check if we need to show year header
    const currentYear = new Date(item.eventDate!).getFullYear();
    const previousYear = index > 0 ? new Date(filteredEvents[index - 1].eventDate!).getFullYear() : null;
    const nextYear = index < filteredEvents.length - 1 ? new Date(filteredEvents[index + 1].eventDate!).getFullYear() : null;
    const showYearHeader = index === 0 || currentYear !== previousYear;
    const isLastInYear = nextYear !== null && currentYear !== nextYear;

    return (
        <>
            {/* Year header */}
            {showYearHeader && (
                <SectionDivider label={String(currentYear)} variant="labelLarge" marginVertical={24} />
            )}

            <View style={styles.timelineItem}>
                {/* Timeline line */}
                <View style={styles.timelineLine}>
                    <View
                        style={[
                            styles.timelineDot,
                            { backgroundColor: personColor },
                            isBirthday && styles.birthdayDot,
                            isImportantDate && styles.anniversaryDot,
                        ]}
                    />
                    {index < filteredEvents.length - 1 && (
                        <View style={[styles.timelineConnector, { backgroundColor: theme.colors.primary }]} />
                    )}
                </View>

                {/* Event content - No card */}
                <View style={styles.eventContent}>
                    {/* Person & Event Type */}
                    <View style={styles.headerRow}>
                        <View style={styles.personRow}>
                            {item.isPartyEvent ? (
                                // Party event - show party icon
                                <View style={[styles.personAvatar, { backgroundColor: theme.colors.primary }]}>
                                    <Text style={styles.personAvatarText}>🎉</Text>
                                </View>
                            ) : person ? (
                                // Regular person event
                                person.photoPath ? (
                                    <View style={styles.avatarWithBorder}>
                                        <Image source={{ uri: person.photoPath }} style={styles.personAvatarImage} />
                                        <View style={[styles.avatarIndicator, { backgroundColor: personColor }]} />
                                    </View>
                                ) : (
                                    <View style={[styles.personAvatar, { backgroundColor: personColor }]}>
                                        <Text style={styles.personAvatarText}>{getInitials(person.name)}</Text>
                                    </View>
                                )
                            ) : null}
                            <View style={styles.personInfo}>
                                <Text
                                    variant="titleSmall"
                                    style={styles.personName}
                                    onPress={() => !item.isPartyEvent && person && router.push(`/person/${person.id}`)}
                                >
                                    {personName}
                                </Text>
                                <Text variant="labelSmall" style={styles.eventMeta}>
                                    {getEventLabel(item.eventType)} · {formatRelativeTime(new Date(item.eventDate!))}
                                </Text>
                            </View>
                        </View>

                        {!isSpecialEvent && (
                            <Menu
                                visible={eventMenuVisible === item.id}
                                onDismiss={() => setEventMenuVisible(null)}
                                anchor={
                                    <IconButton
                                        icon="dots-vertical"
                                        size={20}
                                        onPress={() => setEventMenuVisible(item.id)}
                                        style={styles.menuButton}
                                    />
                                }
                            >
                                <Menu.Item
                                    onPress={() => {
                                        setEventMenuVisible(null);
                                        handleEditEvent(item);
                                    }}
                                    title="Edit"
                                    leadingIcon="pencil-outline"
                                />
                                <Menu.Item
                                    onPress={() => {
                                        setEventMenuVisible(null);
                                        handleDeleteEvent(item.id);
                                    }}
                                    title="Delete"
                                    leadingIcon="delete-outline"
                                />
                            </Menu>
                        )}
                    </View>

                    {/* Event Notes */}
                    {item.notes && (
                        <Text variant="bodyMedium" style={styles.eventNotes}>
                            {item.notes}
                        </Text>
                    )}

                    {/* Party Management Buttons */}
                    {item.isPartyEvent && item.partyDetails && (
                        <View style={styles.partyActions}>
                            <Text variant="labelSmall" style={styles.guestCount}>
                                👥 {item.guestCount} {item.guestCount === 1 ? 'guest' : 'guests'}
                            </Text>
                            {/* Removed party button for now as it was causing issues in extraction, can be re-added if needed */}
                        </View>
                    )}

                    {/* Meta Info */}
                    {(item.location || item.duration) && (
                        <View style={styles.metaRow}>
                            {item.location && (
                                <Text variant="labelSmall" style={styles.metaText}>
                                    📍 {item.location}
                                </Text>
                            )}
                            {item.duration && (
                                <Text variant="labelSmall" style={styles.metaText}>
                                    ⏱️ {item.duration} min
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Divider - hide if last event or last in year */}
                    {index < filteredEvents.length - 1 && !isLastInYear && (
                        <View style={styles.eventDivider} />
                    )}
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 0,
    },
    timelineLine: {
        width: 30,
        alignItems: 'center',
    },
    timelineDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        marginTop: 20,
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
    birthdayDot: {
        backgroundColor: '#ff9800',
    },
    anniversaryDot: {
        backgroundColor: '#e91e63',
    },
    timelineConnector: {
        width: 2,
        flex: 1,
        opacity: 0.2,
        marginTop: 6,
    },
    eventContent: {
        flex: 1,
        marginLeft: 12,
        paddingBottom: 20,
    },
    eventDivider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginTop: 16,
        marginBottom: 4,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    personRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    personInfo: {
        flex: 1,
    },
    personAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    personAvatarText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    avatarWithBorder: {
        position: 'relative',
        marginRight: 12,
    },
    avatarIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#fff',
    },
    personAvatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    personName: {
        fontWeight: 'bold',
    },
    eventMeta: {
        opacity: 0.7,
    },
    menuButton: {
        margin: 0,
    },
    eventNotes: {
        marginBottom: 8,
        lineHeight: 20,
    },
    partyActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
        marginBottom: 8,
        backgroundColor: '#f5f5f5',
        padding: 8,
        borderRadius: 8,
    },
    guestCount: {
        opacity: 0.8,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 4,
    },
    metaText: {
        opacity: 0.6,
    },
});
