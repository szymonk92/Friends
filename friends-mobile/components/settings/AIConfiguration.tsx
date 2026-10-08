import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Divider, SegmentedButtons, List, Button, TextInput, useTheme } from 'react-native-paper';
import { AI_MODELS, useSettings, type AIModel } from '@/store/useSettings';
import { useTranslation } from 'react-i18next';

interface AIConfigurationProps {
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
  hasApiKey: () => boolean;
  hasGeminiApiKey: () => boolean;
  hasOllamaApiKey: () => boolean;
  hasActiveApiKey: () => boolean;
  setApiKeyDialogVisible: (visible: boolean) => void;
  setGeminiApiKeyDialogVisible: (visible: boolean) => void;
  setOllamaApiKeyDialogVisible: (visible: boolean) => void;
  handleClearApiKey: () => void;
  handleClearGeminiApiKey: () => void;
  handleClearOllamaApiKey: () => void;
}

export default function AIConfiguration({
  selectedModel,
  setSelectedModel,
  hasApiKey,
  hasGeminiApiKey,
  hasOllamaApiKey,
  hasActiveApiKey,
  setApiKeyDialogVisible,
  setGeminiApiKeyDialogVisible,
  setOllamaApiKeyDialogVisible,
  handleClearApiKey,
  handleClearGeminiApiKey,
  handleClearOllamaApiKey,
}: AIConfigurationProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const {
    ollamaBaseUrl,
    ollamaModel,
    setOllamaBaseUrl,
    setOllamaModel,
  } = useSettings();

  // Local edit state for the Ollama text fields — committed to the store on blur
  // so each keystroke doesn't trigger an AsyncStorage write (which would lag the input).
  const [baseUrlDraft, setBaseUrlDraft] = useState(ollamaBaseUrl);
  const [modelDraft, setModelDraft] = useState(ollamaModel);
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          {t('aiConfig.title')}
        </Text>
        <Divider style={styles.divider} />

        <Text variant="bodySmall" style={styles.description}>
          {t('aiConfig.intro')}
        </Text>

        <Text variant="labelMedium" style={styles.modelLabel}>
          {t('aiConfig.selectedModel')}
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
            {
              value: 'ollama',
              label: 'Ollama',
              icon: hasOllamaApiKey() ? 'check' : 'close',
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
          title={t('aiConfig.anthropicKey')}
          description={hasApiKey() ? t('aiConfig.keySet') : t('aiConfig.notConfigured')}
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
              {t('aiConfig.changeKey')}
            </Button>
            <Button
              mode="outlined"
              onPress={handleClearApiKey}
              icon="delete"
              textColor={theme.colors.error}
              style={styles.button}
            >
              {t('aiConfig.clearClaude')}
            </Button>
          </View>
        ) : (
          <Button
            mode="contained"
            onPress={() => setApiKeyDialogVisible(true)}
            icon="key-plus"
            style={styles.button}
          >
            {t('aiConfig.setClaude')}
          </Button>
        )}

        <Text variant="labelSmall" style={styles.apiKeyHelp}>
          Get your key from: https://console.anthropic.com
        </Text>

        <Divider style={styles.divider} />

        {/* Gemini API Key */}
        <List.Item
          title={t('aiConfig.geminiKey')}
          description={hasGeminiApiKey() ? t('aiConfig.keySet') : t('aiConfig.notConfigured')}
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
              {t('aiConfig.changeKey')}
            </Button>
            <Button
              mode="outlined"
              onPress={handleClearGeminiApiKey}
              icon="delete"
              textColor={theme.colors.error}
              style={styles.button}
            >
              {t('aiConfig.clearGemini')}
            </Button>
          </View>
        ) : (
          <Button
            mode="contained"
            onPress={() => setGeminiApiKeyDialogVisible(true)}
            icon="key-plus"
            style={styles.button}
          >
            {t('aiConfig.setGemini')}
          </Button>
        )}

        <Text variant="labelSmall" style={styles.apiKeyHelp}>
          Get your key from: https://aistudio.google.com/apikey
        </Text>

        <Divider style={styles.divider} />

        {/* Ollama (Local) */}
        <List.Item
          title={t('aiConfig.ollamaKey')}
          description={hasOllamaApiKey() ? t('aiConfig.ollamaKeySet') : t('aiConfig.notConfigured')}
          left={(props) => (
            <List.Icon
              {...props}
              icon={hasOllamaApiKey() ? 'check-circle' : 'alert-circle'}
              color={hasOllamaApiKey() ? theme.colors.primary : theme.colors.error}
            />
          )}
        />

        {hasOllamaApiKey() ? (
          <View style={styles.apiKeyButtons}>
            <Button
              mode="outlined"
              onPress={() => setOllamaApiKeyDialogVisible(true)}
              icon="key-change"
              style={styles.button}
            >
              {t('aiConfig.changeKey')}
            </Button>
            <Button
              mode="outlined"
              onPress={handleClearOllamaApiKey}
              icon="delete"
              textColor={theme.colors.error}
              style={styles.button}
            >
              {t('aiConfig.clearOllama')}
            </Button>
          </View>
        ) : (
          <Button
            mode="contained"
            onPress={() => setOllamaApiKeyDialogVisible(true)}
            icon="key-plus"
            style={styles.button}
          >
            {t('aiConfig.setOllama')}
          </Button>
        )}

        <Text variant="labelSmall" style={styles.apiKeyHelp}>
          {t('aiConfig.ollamaHelp')}
        </Text>

        <Text variant="labelMedium" style={styles.modelLabel}>
          {t('aiConfig.baseUrl')}
        </Text>
        <TextInput
          mode="outlined"
          value={baseUrlDraft}
          onChangeText={setBaseUrlDraft}
          onBlur={() => setOllamaBaseUrl(baseUrlDraft)}
          placeholder="http://localhost:11434"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.ollamaInput}
        />
        <Text variant="labelSmall" style={styles.apiKeyHelp}>
          {t('aiConfig.baseUrlHelp')}
        </Text>

        <Text variant="labelMedium" style={styles.modelLabel}>
          {t('aiConfig.model')}
        </Text>
        <TextInput
          mode="outlined"
          value={modelDraft}
          onChangeText={setModelDraft}
          onBlur={() => setOllamaModel(modelDraft)}
          placeholder="llama3.2:3b"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.ollamaInput}
        />
        <Text variant="labelSmall" style={styles.apiKeyHelp}>
          {t('aiConfig.modelHelp')}
        </Text>

        {!hasActiveApiKey() && (
          <Text variant="bodySmall" style={[styles.warningText, { color: theme.colors.error }]}>
            {t('aiConfig.needKey')}
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
  ollamaInput: {
    marginBottom: 4,
  },
  warningText: {
    marginTop: 16,
  },
});
