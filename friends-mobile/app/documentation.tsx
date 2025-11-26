import { StyleSheet, ScrollView, View } from 'react-native';
import { Text, Card, Divider, List, useTheme, Chip } from 'react-native-paper';
import { Stack } from 'expo-router';

/**
 * Documentation screen explaining app terminology and nomenclature
 * Accessible via /documentation route
 */
export default function DocumentationScreen() {
    const theme = useTheme();

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'App Documentation',
                    presentation: 'modal',
                }}
            />
            <ScrollView style={styles.container}>
                <View style={styles.content}>
                    <Text variant="headlineMedium" style={styles.title}>
                        Friends App - Nomenclature Guide
                    </Text>
                    <Text variant="bodyMedium" style={styles.subtitle}>
                        Understanding the terminology and symbols used in the app
                    </Text>

                    {/* Relations Section */}
                    <Card style={styles.card}>
                        <Card.Content>
                            <Text variant="titleLarge" style={styles.cardTitle}>
                                📊 Relation Types
                            </Text>
                            <Divider style={styles.divider} />

                            <Text variant="bodyMedium" style={styles.description}>
                                Relations describe what people like, dislike, know, fear, and more. Each relation
                                has a type that defines the kind of connection.
                            </Text>

                            <View style={styles.section}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    Preferences
                                </Text>
                                <List.Item
                                    title="LIKES ❤️"
                                    description="Things a person enjoys, prefers, or has positive feelings about"
                                    titleStyle={styles.listTitle}
                                />
                                <List.Item
                                    title="DISLIKES 💔"
                                    description="Things a person dislikes, avoids, or has negative feelings about"
                                    titleStyle={styles.listTitle}
                                />
                                <List.Item
                                    title="PREFERS_OVER 🔄"
                                    description="A choice between two options, showing preference hierarchy"
                                    titleStyle={styles.listTitle}
                                />
                            </View>

                            <View style={styles.section}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    Identity & Skills
                                </Text>
                                <List.Item
                                    title="IS 👤"
                                    description="Defines who someone is (profession, role, trait, identity)"
                                    titleStyle={styles.listTitle}
                                />
                                <List.Item
                                    title="HAS_SKILL 🛠️"
                                    description="Skills, abilities, or expertise a person possesses"
                                    titleStyle={styles.listTitle}
                                />
                                <List.Item
                                    title="USED_TO_BE ⏮️"
                                    description="Past identities, roles, or professions"
                                    titleStyle={styles.listTitle}
                                />
                            </View>

                            <View style={styles.section}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    Behaviors & Habits
                                </Text>
                                <List.Item
                                    title="REGULARLY_DOES 🔁"
                                    description="Activities, habits, or routines someone does regularly"
                                    titleStyle={styles.listTitle}
                                />
                                <List.Item
                                    title="EXPERIENCED 📅"
                                    description="Past events, experiences, or life events"
                                    titleStyle={styles.listTitle}
                                />
                            </View>

                            <View style={styles.section}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    Emotions & Sensitivities
                                </Text>
                                <List.Item
                                    title="FEARS ⚠️"
                                    description="Things that cause fear, anxiety, or phobias"
                                    titleStyle={styles.listTitle}
                                />
                                <List.Item
                                    title="SENSITIVE_TO 🔔"
                                    description="Physical or emotional sensitivities (allergies, triggers)"
                                    titleStyle={styles.listTitle}
                                />
                                <List.Item
                                    title="UNCOMFORTABLE_WITH 😣"
                                    description="Situations, topics, or things that cause discomfort"
                                    titleStyle={styles.listTitle}
                                />
                            </View>

                            <View style={styles.section}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    Other Types
                                </Text>
                                <List.Item
                                    title="KNOWS 🤝"
                                    description="People or things someone is familiar with"
                                    titleStyle={styles.listTitle}
                                />
                                <List.Item
                                    title="BELIEVES 🧠"
                                    description="Beliefs, values, or philosophical positions"
                                    titleStyle={styles.listTitle}
                                />
                                <List.Item
                                    title="WANTS_TO_ACHIEVE 🎯"
                                    description="Goals, aspirations, or future objectives"
                                    titleStyle={styles.listTitle}
                                />
                                <List.Item
                                    title="STRUGGLES_WITH 😔"
                                    description="Challenges, difficulties, or ongoing struggles"
                                    titleStyle={styles.listTitle}
                                />
                                <List.Item
                                    title="CARES_FOR 💚"
                                    description="People, pets, or dependents someone cares for"
                                    titleStyle={styles.listTitle}
                                />
                            </View>
                        </Card.Content>
                    </Card>

                    {/* Status Section */}
                    <Card style={styles.card}>
                        <Card.Content>
                            <Text variant="titleLarge" style={styles.cardTitle}>
                                📌 Relation Status
                            </Text>
                            <Divider style={styles.divider} />

                            <Text variant="bodyMedium" style={styles.description}>
                                Each relation has a status indicating its timeframe and relevance.
                            </Text>

                            <List.Item
                                title="current"
                                description="Active right now (default for most relations)"
                                left={() => <Chip style={styles.chipCurrent}>current</Chip>}
                            />
                            <List.Item
                                title="past"
                                description="Was true in the past but no longer applies"
                                left={() => <Chip style={styles.chipPast}>past</Chip>}
                            />
                            <List.Item
                                title="future"
                                description="Expected or planned for the future"
                                left={() => <Chip style={styles.chipFuture}>future</Chip>}
                            />
                            <List.Item
                                title="aspiration"
                                description="Something they hope to achieve or become"
                                left={() => <Chip style={styles.chipAspiration}>aspiration</Chip>}
                            />
                        </Card.Content>
                    </Card>

                    {/* Intensity Section */}
                    <Card style={styles.card}>
                        <Card.Content>
                            <Text variant="titleLarge" style={styles.cardTitle}>
                                📈 Intensity Levels
                            </Text>
                            <Divider style={styles.divider} />

                            <Text variant="bodyMedium" style={styles.description}>
                                Intensity indicates how strong a relation is.
                            </Text>

                            <List.Item
                                title="Weak +"
                                description="Mild preference or light connection"
                                titleStyle={{ fontWeight: '300' }}
                            />
                            <List.Item
                                title="Medium ++"
                                description="Moderate preference or notable connection"
                                titleStyle={{ fontWeight: '500' }}
                            />
                            <List.Item
                                title="Strong +++"
                                description="Strong preference or important connection"
                                titleStyle={{ fontWeight: '700' }}
                            />
                            <List.Item
                                title="Very Strong ++++"
                                description="Extremely strong or core belief/value"
                                titleStyle={{ fontWeight: '900' }}
                            />
                        </Card.Content>
                    </Card>

                    {/* Connections Section */}
                    <Card style={styles.card}>
                        <Card.Content>
                            <Text variant="titleLarge" style={styles.cardTitle}>
                                🔗 Person Connections
                            </Text>
                            <Divider style={styles.divider} />

                            <Text variant="bodyMedium" style={styles.description}>
                                Connections represent relationships between people in your network.
                            </Text>

                            <View style={styles.section}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    Relationship Types
                                </Text>
                                <List.Item
                                    title="Friend 💙"
                                    description="Personal friendship"
                                    titleStyle={styles.listTitle}
                                />
                                <List.Item
                                    title="Family 🏠"
                                    description="Blood relatives or close family"
                                    titleStyle={styles.listTitle}
                                />
                                <List.Item
                                    title="Colleague 💼"
                                    description="Work or professional relationships"
                                    titleStyle={styles.listTitle}
                                />
                                <List.Item
                                    title="Partner ❤️"
                                    description="Romantic or life partner"
                                    titleStyle={styles.listTitle}
                                />
                                <List.Item
                                    title="Acquaintance 👋"
                                    description="Casual or limited connection"
                                    titleStyle={styles.listTitle}
                                />
                            </View>

                            <View style={styles.section}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    Connection Status
                                </Text>
                                <List.Item
                                    title="Active"
                                    description="Currently maintaining this relationship"
                                    left={() => <Chip>active</Chip>}
                                />
                                <List.Item
                                    title="Inactive"
                                    description="Not actively in touch but connection exists"
                                    left={() => <Chip>inactive</Chip>}
                                />
                                <List.Item
                                    title="Ended"
                                    description="Relationship has concluded"
                                    left={() => <Chip>ended</Chip>}
                                />
                                <List.Item
                                    title="Complicated"
                                    description="Complex or mixed relationship status"
                                    left={() => <Chip>complicated</Chip>}
                                />
                            </View>
                        </Card.Content>
                    </Card>

                    {/* UI Symbols */}
                    <Card style={styles.card}>
                        <Card.Content>
                            <Text variant="titleLarge" style={styles.cardTitle}>
                                🔤 UI Symbols Explained
                            </Text>
                            <Divider style={styles.divider} />

                            <List.Item
                                title="+ Pluses"
                                description="Represent intensity. More pluses = stronger intensity (+ to ++++)"
                            />
                            <List.Item
                                title="− Minuses"
                                description="Not currently used in the app, reserved for future features"
                            />
                            <List.Item
                                title="Numbers (3/5)"
                                description="Current count / Maximum limit (e.g., photos: 3 out of 5 allowed)"
                            />
                            <List.Item
                                title="✓ Checkmark Badge"
                                description="Indicates the profile photo on person cards"
                            />
                        </Card.Content>
                    </Card>

                    {/* Tips */}
                    <Card style={styles.card}>
                        <Card.Content>
                            <Text variant="titleLarge" style={styles.cardTitle}>
                                💡 Pro Tips
                            </Text>
                            <Divider style={styles.divider} />

                            <List.Item
                                title="Quick Actions"
                                description="Long press on items for quick actions and options"
                                left={(props) => <List.Icon {...props} icon="gesture-tap-hold" />}
                            />
                            <List.Item
                                title="Photo Browser"
                                description="Tap photos to view full-screen with pinch-to-zoom"
                                left={(props) => <List.Icon {...props} icon="image" />}
                            />
                            <List.Item
                                title="AI Extraction"
                                description="Write natural stories and let AI automatically extract relations"
                                left={(props) => <List.Icon {...props} icon="brain" />}
                            />
                            <List.Item
                                title="Timeline Filters"
                                description="Use filters to view specific types of relations in the timeline"
                                left={(props) => <List.Icon {...props} icon="filter" />}
                            />
                        </Card.Content>
                    </Card>

                    <View style={styles.spacer} />
                </View>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 16,
    },
    title: {
        marginBottom: 8,
        fontWeight: '700',
    },
    subtitle: {
        marginBottom: 24,
        opacity: 0.7,
    },
    card: {
        marginBottom: 16,
    },
    cardTitle: {
        marginBottom: 8,
        fontWeight: '600',
    },
    divider: {
        marginBottom: 16,
    },
    description: {
        marginBottom: 16,
        lineHeight: 20,
        opacity: 0.8,
    },
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        marginBottom: 8,
        marginTop: 8,
        fontWeight: '600',
    },
    listTitle: {
        fontWeight: '500',
    },
    chipCurrent: {
        backgroundColor: '#4caf50',
        marginTop: 8,
    },
    chipPast: {
        backgroundColor: '#9e9e9e',
        marginTop: 8,
    },
    chipFuture: {
        backgroundColor: '#2196f3',
        marginTop: 8,
    },
    chipAspiration: {
        backgroundColor: '#ff9800',
        marginTop: 8,
    },
    spacer: {
        height: 40,
    },
});
