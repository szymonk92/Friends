import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text, TextInput, SegmentedButtons } from 'react-native-paper';

interface PartyDetailsFormProps {
    name: string;
    setName: (name: string) => void;
    type: 'dinner' | 'party' | 'gathering';
    setType: (type: 'dinner' | 'party' | 'gathering') => void;
    date: string;
    setDate: (date: string) => void;
    location: string;
    setLocation: (location: string) => void;
}

export default function PartyDetailsForm({
    name,
    setName,
    type,
    setType,
    date,
    setDate,
    location,
    setLocation,
}: PartyDetailsFormProps) {
    return (
        <Card style={styles.card}>
            <Card.Content>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                    Party Details
                </Text>

                <TextInput
                    label="Party Name"
                    value={name}
                    onChangeText={setName}
                    mode="outlined"
                    style={styles.input}
                    placeholder="e.g., Summer BBQ, Birthday Dinner"
                />

                <SegmentedButtons
                    value={type}
                    onValueChange={(v) => setType(v as any)}
                    buttons={[
                        { value: 'dinner', label: 'Dinner' },
                        { value: 'party', label: 'Party' },
                        { value: 'gathering', label: 'Gathering' },
                    ]}
                    style={styles.segmentedButton}
                />

                <TextInput
                    label="Date (YYYY-MM-DD)"
                    value={date}
                    onChangeText={setDate}
                    mode="outlined"
                    style={styles.input}
                    placeholder="2024-12-25"
                />

                <TextInput
                    label="Location"
                    value={location}
                    onChangeText={setLocation}
                    mode="outlined"
                    style={styles.input}
                    placeholder="e.g., My place, Restaurant name"
                />
            </Card.Content>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        margin: 16,
        marginBottom: 8,
    },
    sectionTitle: {
        marginBottom: 12,
        fontWeight: 'bold',
    },
    input: {
        marginBottom: 12,
    },
    segmentedButton: {
        marginBottom: 12,
    },
});
