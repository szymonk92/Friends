import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AI_MODELS, useSettings, type AIModel } from '@/store/useSettings';
import { useTranslation } from 'react-i18next';
import { FormInput, FormSection } from '@/components/FormKit';
import { PillGroup } from '@/components/PillGroup';
import { PrimaryButton } from '@/components/PrimaryButton';
import { fz, fzText } from '@/lib/design/tokens';

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
  const { ollamaBaseUrl, ollamaModel, setOllamaBaseUrl, setOllamaModel } = useSettings();

  // Local edit state for the Ollama text fields — committed to the store on blur
  // so each keystroke doesn't trigger an AsyncStorage write (which would lag the input).
  const [baseUrlDraft, setBaseUrlDraft] = useState(ollamaBaseUrl);
  const [modelDraft, setModelDraft] = useState(ollamaModel);

  const providers = [
    {
      value: 'anthropic' as const,
      label: 'Claude',
      title: t('aiConfig.anthropicKey'),
      has: hasApiKey(),
      status: t('aiConfig.keySet'),
      open: () => setApiKeyDialogVisible(true),
      clear: handleClearApiKey,
      clearLabel: t('aiConfig.clearClaude'),
      setLabel: t('aiConfig.setClaude'),
      help: 'Get your key from: https://console.anthropic.com',
    },
    {
      value: 'gemini' as const,
      label: 'Gemini',
      title: t('aiConfig.geminiKey'),
      has: hasGeminiApiKey(),
      status: t('aiConfig.keySet'),
      open: () => setGeminiApiKeyDialogVisible(true),
      clear: handleClearGeminiApiKey,
      clearLabel: t('aiConfig.clearGemini'),
      setLabel: t('aiConfig.setGemini'),
      help: 'Get your key from: https://aistudio.google.com/apikey',
    },
    {
      value: 'ollama' as const,
      label: 'Ollama',
      title: t('aiConfig.ollamaKey'),
      has: hasOllamaApiKey(),
      status: t('aiConfig.ollamaKeySet'),
      open: () => setOllamaApiKeyDialogVisible(true),
      clear: handleClearOllamaApiKey,
      clearLabel: t('aiConfig.clearOllama'),
      setLabel: t('aiConfig.setOllama'),
      help: t('aiConfig.ollamaHelp'),
    },
  ];

  return (
    <>
      <FormSection title={t('aiConfig.title')} hint={t('aiConfig.intro')}>
        <Text style={[fzText.sub, styles.label]}>{t('aiConfig.selectedModel')}</Text>
        <PillGroup
          options={providers.map((p) => ({
            value: p.value,
            label: `${p.has ? '✓' : '✗'} ${p.label}`,
          }))}
          value={selectedModel}
          onChange={(v) => setSelectedModel(v as AIModel)}
        />
        <Text style={[fzText.sub, styles.label, { marginTop: fz.s.md }]}>
          {AI_MODELS[selectedModel].name}: {AI_MODELS[selectedModel].description}
        </Text>
        {!hasActiveApiKey() && (
          <Text style={[fzText.sub, styles.warn]}>{t('aiConfig.needKey')}</Text>
        )}
      </FormSection>

      {providers.map((p) => (
        <FormSection key={p.value} title={p.title}>
          <Text style={[fzText.name, { color: p.has ? fz.success : fz.warn }]}>
            {p.has ? p.status : t('aiConfig.notConfigured')}
          </Text>
          <View style={styles.buttons}>
            {p.has ? (
              <>
                <PrimaryButton
                  variant="outline"
                  label={t('aiConfig.changeKey')}
                  onPress={p.open}
                  style={styles.button}
                />
                <PrimaryButton
                  variant="outline"
                  label={p.clearLabel}
                  onPress={p.clear}
                  style={styles.button}
                />
              </>
            ) : (
              <PrimaryButton label={p.setLabel} onPress={p.open} style={styles.button} />
            )}
          </View>
          <Text style={[fzText.meta, styles.label]}>{p.help}</Text>

          {p.value === 'ollama' && (
            <>
              <Text style={[fzText.sub, styles.label, { marginTop: fz.s.lg }]}>
                {t('aiConfig.baseUrl')}
              </Text>
              <FormInput
                value={baseUrlDraft}
                onChangeText={setBaseUrlDraft}
                onBlur={() => setOllamaBaseUrl(baseUrlDraft)}
                placeholder="http://localhost:11434"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Text style={[fzText.meta, styles.label]}>{t('aiConfig.baseUrlHelp')}</Text>

              <Text style={[fzText.sub, styles.label, { marginTop: fz.s.lg }]}>
                {t('aiConfig.model')}
              </Text>
              <FormInput
                value={modelDraft}
                onChangeText={setModelDraft}
                onBlur={() => setOllamaModel(modelDraft)}
                placeholder="llama3.2:3b"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={[fzText.meta, styles.label]}>{t('aiConfig.modelHelp')}</Text>
            </>
          )}
        </FormSection>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: fz.s.xs },
  warn: { color: fz.danger, marginTop: fz.s.sm },
  buttons: { flexDirection: 'row', gap: fz.s.sm, marginTop: fz.s.md },
  button: { flex: 1, paddingHorizontal: 12 },
});
