import { StyleSheet, ScrollView, View } from 'react-native';
import { Text, Button, Portal, TextInput } from 'react-native-paper';
import { Dialog } from '@/components/KeyboardAwareDialog';
import { AppBar } from '@/components/AppBar';
import { confirmDestructive, fzAlert } from '@/lib/utils/confirm';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/store/useSettings';
import { fz } from '@/lib/design/tokens';

import AppearanceSettings from '@/components/settings/AppearanceSettings';
import AIConfiguration from '@/components/settings/AIConfiguration';
import LanguageSelector from '@/components/settings/LanguageSelector';

export default function SettingsScreen() {
  const { t } = useTranslation();

  // API Key state
  const {
    setApiKey,
    setGeminiApiKey,
    setOllamaApiKey,
    clearApiKey,
    clearGeminiApiKey,
    clearOllamaApiKey,
    loadApiKey,
    loadGeminiApiKey,
    loadOllamaApiKey,
    loadOllamaBaseUrl,
    loadOllamaModel,
    hasApiKey,
    hasGeminiApiKey,
    hasOllamaApiKey,
    selectedModel,
    setSelectedModel,
    loadSelectedModel,
    hasActiveApiKey,
    fontFamily,
    setFontFamily,
    loadFontFamily,
    loadMaxPhotosPerPerson,
  } = useSettings();
  useEffect(() => {
    loadApiKey();
    loadGeminiApiKey();
    loadOllamaApiKey();
    loadOllamaBaseUrl();
    loadOllamaModel();
    loadSelectedModel();
    loadFontFamily();
    loadMaxPhotosPerPerson();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: store loaders are stable
  }, []);

  // One dialog for all three providers; only labels and store actions differ.
  const providers = {
    claude: {
      has: hasApiKey, save: setApiKey, clear: clearApiKey,
      title: [t('settingsScreen.changeClaude'), t('aiConfig.setClaude')],
      hint: t('settingsScreen.enterClaude'), label: t('addStory.apiKey'), placeholder: 'sk-ant-...',
      empty: t('addStory.invalidKeyMessage'), saved: t('settingsScreen.anthropicSaved'),
      clearTitle: t('settingsScreen.clearAnthropic'), clearMsg: t('settingsScreen.removeAnthropic'),
      cleared: t('settingsScreen.anthropicCleared'),
    },
    gemini: {
      has: hasGeminiApiKey, save: setGeminiApiKey, clear: clearGeminiApiKey,
      title: [t('settingsScreen.changeGemini'), t('aiConfig.setGemini')],
      hint: t('settingsScreen.enterGemini'), label: t('addStory.apiKey'), placeholder: 'AIza...',
      empty: t('addStory.invalidKeyMessage'), saved: t('settingsScreen.geminiSaved'),
      clearTitle: t('settingsScreen.clearGemini'), clearMsg: t('settingsScreen.removeGemini'),
      cleared: t('settingsScreen.geminiCleared'),
    },
    ollama: {
      has: hasOllamaApiKey, save: setOllamaApiKey, clear: clearOllamaApiKey,
      title: [t('settingsScreen.changeOllama'), t('aiConfig.setOllama')],
      hint: t('settingsScreen.enterOllama'), label: t('settingsScreen.keyPlaceholderLabel'), placeholder: 'ollama',
      empty: t('settingsScreen.ollamaValue'), saved: t('settingsScreen.ollamaSaved'),
      clearTitle: t('settingsScreen.clearOllama'), clearMsg: t('settingsScreen.removeOllama'),
      cleared: t('settingsScreen.ollamaCleared'),
    },
  };
  type Provider = keyof typeof providers;
  const [editing, setEditing] = useState<Provider | null>(null);
  const [tempKey, setTempKey] = useState('');
  const current = editing ? providers[editing] : null;

  const closeDialog = () => {
    setEditing(null);
    setTempKey('');
  };

  const saveKey = async () => {
    if (!current) return;
    if (tempKey.trim().length === 0) {
      fzAlert(t('addStory.invalidKeyTitle'), current.empty);
      return;
    }
    try {
      await current.save(tempKey.trim());
      closeDialog();
      fzAlert(t('common.success'), current.saved);
    } catch {
      fzAlert(t('common.error'), t('addStory.keySaveFailed'));
    }
  };

  const clearKey = (provider: Provider) => {
    const p = providers[provider];
    confirmDestructive({
      title: p.clearTitle,
      message: p.clearMsg,
      confirmLabel: t('settingsScreen.clear'),
      onConfirm: async () => {
        await p.clear();
        fzAlert(t('common.success'), p.cleared);
      },
    });
  };

  return (
    <>
      <AppBar title={t('settings.title')} />
      <ScrollView style={styles.container}>
        <AppearanceSettings
          fontFamily={fontFamily}
          setFontFamily={setFontFamily}
        />

        <LanguageSelector />

        <AIConfiguration
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          hasApiKey={hasApiKey}
          hasGeminiApiKey={hasGeminiApiKey}
          hasOllamaApiKey={hasOllamaApiKey}
          hasActiveApiKey={hasActiveApiKey}
          setApiKeyDialogVisible={(v: boolean) => setEditing(v ? 'claude' : null)}
          setGeminiApiKeyDialogVisible={(v: boolean) => setEditing(v ? 'gemini' : null)}
          setOllamaApiKeyDialogVisible={(v: boolean) => setEditing(v ? 'ollama' : null)}
          handleClearApiKey={() => clearKey('claude')}
          handleClearGeminiApiKey={() => clearKey('gemini')}
          handleClearOllamaApiKey={() => clearKey('ollama')}
        />

        <View style={styles.spacer} />
      </ScrollView>

      <Portal>
        <Dialog visible={!!current} onDismiss={closeDialog} style={styles.dialog}>
          <Dialog.Title>{current ? current.title[current.has() ? 0 : 1] : ''}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              {current?.hint}
            </Text>
            <TextInput
              mode="outlined"
              label={current?.label}
              placeholder={current?.placeholder}
              value={tempKey}
              onChangeText={setTempKey}
              secureTextEntry
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDialog}>{t('common.cancel')}</Button>
            <Button onPress={saveKey}>{t('common.save')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: fz.paper,
    paddingTop: 16,
  },
  spacer: {
    height: 40,
  },
  dialog: {
    borderRadius: fz.rCard,
    backgroundColor: fz.card,
  },
  dialogText: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
  },
});
