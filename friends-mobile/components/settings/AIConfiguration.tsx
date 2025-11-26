import { View, StyleSheet } from 'react-native';
import { Card, Text, Divider, SegmentedButtons, List, Button, useTheme } from 'react-native-paper';
import { AI_MODELS, type AIModel } from '@/store/useSettings';

interface AIConfigurationProps {
    selectedModel: AIModel;
    setSelectedModel: (model: AIModel) => void;
    hasApiKey: () => boolean;
    hasGeminiApiKey: () => boolean;
    hasActiveApiKey: () => boolean;
    setApiKeyDialogVisible: (visible: boolean) => void;
    setGeminiApiKeyDialogVisible: (visible: boolean) => void;
    handleClearApiKey: () => void;
    handleClearGeminiApiKey: () => void;
}

export default function AIConfiguration({
    selectedModel,
    setSelectedModel,
    hasApiKey,
    hasGeminiApiKey,
    hasActiveApiKey,
    setApiKeyDialogVisible,
    setGeminiApiKeyDialogVisible,
    handleClearApiKey,
    handleClearGeminiApiKey,
}: AIConfigurationProps) {
    const theme = useTheme();
    return (
        <Card style={styles.card}>
            <Card.Content>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                    AI Configuration
                </Text>
                <Divider style={styles.divider} />

                <Text variant="bodySmall" style={styles.description}>
                    Choose your AI model and configure API keys for AI-powered story extraction.
                </Text>

                <Text variant="labelMedium" style={styles.modelLabel}>
                    Selected AI Model
                </Text>
                <SegmentedButtons
                    value={selectedModel}
                    onValueChange={(value) => setSelectedModel(value as AIModel)}
                    buttons={[
                        {
                            value: 'anthropic',
                            label: 'Claude',
                            icon: hasApiKey() ? 'check' : 'close',
                        },
                        {
                            value: 'gemini',
                            label: 'Gemini',
                            icon: hasGeminiApiKey() ? 'check' : 'close',
                        },
                    ]}
                    style={styles.segmentedButtons}
                />

                <Text variant="bodySmall" style={styles.modelDescription}>
                    {AI_MODELS[selectedModel].name}: {AI_MODELS[selectedModel].description}
                </Text>

                <Divider style={styles.divider} />

                {/* Anthropic API Key */}
                <List.Item
                    title="Anthropic (Claude) API Key"
                    description={hasApiKey() ? 'Key is set (stored securely)' : 'Not configured'}
                    left={(props) => (
                        <List.Icon
                            {...props}
                            icon={hasApiKey() ? 'check-circle' : 'alert-circle'}
                            color={hasApiKey() ? theme.colors.primary : theme.colors.error}
                        />
                    )}
                />

                {hasApiKey() ? (
                    <View style={styles.apiKeyButtons}>
                        <Button
                            mode="outlined"
                            onPress={() => setApiKeyDialogVisible(true)}
                            icon="key-change"
                            style={styles.button}
                        >
                            Change Key
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={handleClearApiKey}
                            icon="delete"
                            textColor={theme.colors.error}
                            style={styles.button}
                        >
                            Clear Claude Key
                        </Button>
                    </View>
                ) : (
                    <Button
                        mode="contained"
                        onPress={() => setApiKeyDialogVisible(true)}
                        icon="key-plus"
                        style={styles.button}
                    >
                        Set Claude API Key
                    </Button>
                )}

                <Text variant="labelSmall" style={styles.apiKeyHelp}>
                    Get your key from: https://console.anthropic.com
                </Text>

                <Divider style={styles.divider} />

                {/* Gemini API Key */}
                <List.Item
                    title="Google Gemini API Key"
                    description={hasGeminiApiKey() ? 'Key is set (stored securely)' : 'Not configured'}
                    left={(props) => (
                        <List.Icon
                            {...props}
                            icon={hasGeminiApiKey() ? 'check-circle' : 'alert-circle'}
                            color={hasGeminiApiKey() ? theme.colors.primary : theme.colors.error}
                        />
                    )}
                />

                {hasGeminiApiKey() ? (
                    <View style={styles.apiKeyButtons}>
                        <Button
                            mode="outlined"
                            onPress={() => setGeminiApiKeyDialogVisible(true)}
                            icon="key-change"
                            style={styles.button}
                        >
                            Change Key
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={handleClearGeminiApiKey}
                            icon="delete"
                            textColor={theme.colors.error}
                            style={styles.button}
                        >
                            Clear Gemini Key
                        </Button>
                    </View>
                ) : (
                    <Button
                        mode="contained"
                        onPress={() => setGeminiApiKeyDialogVisible(true)}
                        icon="key-plus"
                        style={styles.button}
                    >
                        Set Gemini API Key
                    </Button>
                )}

                <Text variant="labelSmall" style={styles.apiKeyHelp}>
                    Get your key from: https://aistudio.google.com/apikey
                </Text>

                {!hasActiveApiKey() && (
                    <Text variant="bodySmall" style={[styles.warningText, { color: theme.colors.error }]}>
                        ⚠️ You need to configure an API key for the selected model to use AI extraction.
                    </Text>
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
        marginTop: 16,
    },
    description: {
        marginBottom: 16,
        opacity: 0.7,
    },
    modelLabel: {
        marginBottom: 8,
    },
    segmentedButtons: {
        marginBottom: 8,
    },
    modelDescription: {
        opacity: 0.6,
        marginBottom: 8,
    },
    apiKeyButtons: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    button: {
        flex: 1,
    },
    apiKeyHelp: {
        opacity: 0.5,
        marginTop: 4,
        marginBottom: 8,
    },
    warningText: {
        marginTop: 16,
    },
});
