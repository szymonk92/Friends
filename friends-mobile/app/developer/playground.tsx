import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Card, SegmentedButtons, ActivityIndicator, HelperText, useTheme } from 'react-native-paper';
import { Stack } from 'expo-router';
import { extractRelationsFromStorySession, ExtractionResult } from '../../lib/ai/extraction';
import { AIModel, useSettings } from '../../store/useSettings';
import { AIServiceConfig } from '../../lib/ai/ai-service';

export default function PlaygroundScreen() {
    const theme = useTheme();
    const { apiKey, geminiApiKey, hasActiveApiKey } = useSettings();

    const [story, setStory] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ExtractionResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [selectedModel, setSelectedModel] = useState<AIModel>('gemini');
    const [variant, setVariant] = useState<'default' | 'strict' | 'creative'>('default');

    const handleExtract = async () => {
        if (!story.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            // Determine which API key to use based on selected model
            let activeApiKey = '';
            if (selectedModel === 'anthropic') {
                activeApiKey = apiKey || '';
            } else {
                activeApiKey = geminiApiKey || '';
            }

            if (!activeApiKey) {
                throw new Error(`No API key set for ${selectedModel}`);
            }

            const config: AIServiceConfig = {
                model: selectedModel,
                apiKey: activeApiKey
            };

            // We need to pass the variant to the system prompt.
            // Since extractRelationsFromStorySession uses createSystemPrompt internally,
            // we might need to modify extractRelationsFromStorySession to accept session config or prompt.
            // FOR NOW: We will assume we just want to test the model output with default prompt, 
            // or we need to update extractRelations to allow overriding system prompt.
            //
            // Checking local files, we see extractRelationsFromStorySession creates a session with createSystemPrompt().
            // We should probably update extraction.ts to allow passing a system prompt or variant, but 
            // for this MVP let's stick to the available function.
            // Wait! I updated createSystemPrompt but not extraction.ts to pass it through!
            // I should update extraction.ts next.

            const extractionResult = await extractRelationsFromStorySession(
                story,
                [], // No existing people for playground
                config
                // We'll need to update extraction.ts to pass variant if we want to support it fully here
            );

            setResult(extractionResult);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <Stack.Screen options={{ title: 'AI Playground', presentation: 'modal' }} />
            <ScrollView contentContainerStyle={styles.container}>
                <Card style={styles.inputCard}>
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.label}>Test Story Extraction</Text>

                        <View style={styles.controls}>
                            <Text variant="labelSmall">Model</Text>
                            <SegmentedButtons
                                value={selectedModel}
                                onValueChange={(val) => setSelectedModel(val as AIModel)}
                                buttons={[
                                    { value: 'gemini', label: 'Gemini' },
                                    { value: 'anthropic', label: 'Claude' },
                                ]}
                                style={styles.segmented}
                            />
                            {/* Sub-selection for Gemini could go here if needed, or just rely on global settings? 
                     Actually the UI above just toggles anthropic/gemini family. To keep it simple, 
                     we might want a dropdown for specific models. For now let's stick to family or 
                     update UI to show specific gemini versions.
                     Let's add specific versions to SegmentedButtons if space allows, or use a picker.
                     Given space constraints, let's just stick to 'gemini' (which defaults to 2.0-flash-lite)
                     and maybe add 'Flash' button.
                  */}
                        </View>

                        <TextInput
                            mode="outlined"
                            multiline
                            numberOfLines={6}
                            placeholder="Enter a story about a friend..."
                            value={story}
                            onChangeText={setStory}
                            style={styles.input}
                        />

                        <Button
                            mode="contained"
                            onPress={handleExtract}
                            loading={loading}
                            disabled={loading || !story.trim()}
                            icon="creation"
                        >
                            Extract Information
                        </Button>

                        {error && (
                            <HelperText type="error" visible={!!error}>
                                {error}
                            </HelperText>
                        )}
                    </Card.Content>
                </Card>

                {result && (
                    <View style={styles.results}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>Extraction Results</Text>

                        <Card style={styles.resultCard}>
                            <Card.Title title="People Found" />
                            <Card.Content>
                                {result.people.length === 0 ? (
                                    <Text variant="bodyMedium" style={{ opacity: 0.6 }}>No people found.</Text>
                                ) : (
                                    result.people.map((p, i) => (
                                        <View key={i} style={styles.item}>
                                            <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>{p.name}</Text>
                                            <Text variant="bodySmall">{p.isNew ? 'New' : 'Existing'} • {p.personType} • {(p.confidence * 100).toFixed(0)}%</Text>
                                        </View>
                                    ))
                                )}
                            </Card.Content>
                        </Card>

                        <Card style={styles.resultCard}>
                            <Card.Title title="Relations" />
                            <Card.Content>
                                {result.relations.length === 0 ? (
                                    <Text variant="bodyMedium" style={{ opacity: 0.6 }}>No relations found.</Text>
                                ) : (
                                    result.relations.map((r, i) => (
                                        <View key={i} style={styles.item}>
                                            <Text variant="bodyMedium">
                                                <Text style={{ fontWeight: 'bold' }}>{r.subjectName}</Text> {r.relationType} <Text style={{ fontWeight: 'bold' }}>{r.objectLabel}</Text>
                                            </Text>
                                            <Text variant="bodySmall" style={{ opacity: 0.7 }}>Intensity: {r.intensity}</Text>
                                        </View>
                                    ))
                                )}
                            </Card.Content>
                        </Card>

                        <Card style={styles.resultCard}>
                            <Card.Title title="Raw JSON" />
                            <Card.Content>
                                <Text variant="bodySmall" style={{ fontFamily: 'System' }}>
                                    {JSON.stringify(result, null, 2)}
                                </Text>
                            </Card.Content>
                        </Card>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingBottom: 40,
    },
    inputCard: {
        marginBottom: 20,
    },
    label: {
        marginBottom: 12,
    },
    controls: {
        marginBottom: 16,
    },
    segmented: {
        marginTop: 4,
    },
    input: {
        marginBottom: 16,
        backgroundColor: 'transparent',
    },
    results: {
        gap: 16,
    },
    sectionTitle: {
        marginLeft: 4,
        marginBottom: 8,
    },
    resultCard: {
        marginBottom: 8,
    },
    item: {
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#ccc',
    }
});
