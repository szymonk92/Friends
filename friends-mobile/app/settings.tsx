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
  const [apiKeyDialogVisible, setApiKeyDialogVisible] = useState(false);
  const [geminiApiKeyDialogVisible, setGeminiApiKeyDialogVisible] = useState(false);
  const [ollamaApiKeyDialogVisible, setOllamaApiKeyDialogVisible] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [tempGeminiApiKey, setTempGeminiApiKey] = useState('');
  const [tempOllamaApiKey, setTempOllamaApiKey] = useState('');

  useEffect(() => {
    loadApiKey();
    loadGeminiApiKey();
    loadOllamaApiKey();
    loadOllamaBaseUrl();
    loadOllamaModel();
    loadSelectedModel();
    loadFontFamily();
    loadMaxPhotosPerPerson();
  }, []);

  const handleSaveApiKey = async () => {
    if (tempApiKey.trim().length === 0) {
      fzAlert(t('addStory.invalidKeyTitle'), t('addStory.invalidKeyMessage'));
      return;
    }

    try {
      await setApiKey(tempApiKey.trim());
      setApiKeyDialogVisible(false);
      setTempApiKey('');
      fzAlert(t('common.success'), t('settingsScreen.anthropicSaved'));
    } catch (error) {
      fzAlert(t('common.error'), t('addStory.keySaveFailed'));
    }
  };

  const handleSaveGeminiApiKey = async () => {
    if (tempGeminiApiKey.trim().length === 0) {
      fzAlert(t('addStory.invalidKeyTitle'), t('addStory.invalidKeyMessage'));
      return;
    }

    try {
      await setGeminiApiKey(tempGeminiApiKey.trim());
      setGeminiApiKeyDialogVisible(false);
      setTempGeminiApiKey('');
      fzAlert(t('common.success'), t('settingsScreen.geminiSaved'));
    } catch (error) {
      fzAlert(t('common.error'), t('addStory.keySaveFailed'));
    }
  };

  const handleClearApiKey = () => {
    confirmDestructive({
      title: t('settingsScreen.clearAnthropic'),
      message: t('settingsScreen.removeAnthropic'),
      confirmLabel: t('settingsScreen.clear'),
      onConfirm: async () => {
        await clearApiKey();
        fzAlert(t('common.success'), t('settingsScreen.anthropicCleared'));
      },
    });
  };

  const handleClearGeminiApiKey = () => {
    confirmDestructive({
      title: t('settingsScreen.clearGemini'),
      message: t('settingsScreen.removeGemini'),
      confirmLabel: t('settingsScreen.clear'),
      onConfirm: async () => {
        await clearGeminiApiKey();
        fzAlert(t('common.success'), t('settingsScreen.geminiCleared'));
      },
    });
  };

  const handleSaveOllamaApiKey = async () => {
    if (tempOllamaApiKey.trim().length === 0) {
      fzAlert(t('addStory.invalidKeyTitle'), t('settingsScreen.ollamaValue'));
      return;
    }

    try {
      await setOllamaApiKey(tempOllamaApiKey.trim());
      setOllamaApiKeyDialogVisible(false);
      setTempOllamaApiKey('');
      fzAlert(t('common.success'), t('settingsScreen.ollamaSaved'));
    } catch (error) {
      fzAlert(t('common.error'), t('addStory.keySaveFailed'));
    }
  };

  const handleClearOllamaApiKey = () => {
    confirmDestructive({
      title: t('settingsScreen.clearOllama'),
      message: t('settingsScreen.removeOllama'),
      confirmLabel: t('settingsScreen.clear'),
      onConfirm: async () => {
        await clearOllamaApiKey();
        fzAlert(t('common.success'), t('settingsScreen.ollamaCleared'));
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
          setApiKeyDialogVisible={setApiKeyDialogVisible}
          setGeminiApiKeyDialogVisible={setGeminiApiKeyDialogVisible}
          setOllamaApiKeyDialogVisible={setOllamaApiKeyDialogVisible}
          handleClearApiKey={handleClearApiKey}
          handleClearGeminiApiKey={handleClearGeminiApiKey}
          handleClearOllamaApiKey={handleClearOllamaApiKey}
        />

        <View style={styles.spacer} />
      </ScrollView>

      {/* Anthropic API Key Dialog */}
      <Portal>
        <Dialog
          visible={apiKeyDialogVisible}
          onDismiss={() => setApiKeyDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            {hasApiKey() ? t('settingsScreen.changeClaude') : t('aiConfig.setClaude')}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={[styles.dialogText, styles.dialogFont]}>
              {t('settingsScreen.enterClaude')}
            </Text>
            <TextInput
              mode="outlined"
              label={t('addStory.apiKey')}
              placeholder="sk-ant-..."
              value={tempApiKey}
              onChangeText={setTempApiKey}
              secureTextEntry
              style={[styles.input, styles.dialogFont]}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button labelStyle={styles.dialogFont} onPress={() => setApiKeyDialogVisible(false)}>
              {t('common.cancel')}
            </Button>
            <Button labelStyle={styles.dialogFont} onPress={handleSaveApiKey}>
              {t('common.save')}
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Gemini API Key Dialog */}
        <Dialog
          visible={geminiApiKeyDialogVisible}
          onDismiss={() => setGeminiApiKeyDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            {hasGeminiApiKey() ? t('settingsScreen.changeGemini') : t('aiConfig.setGemini')}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={[styles.dialogText, styles.dialogFont]}>
              {t('settingsScreen.enterGemini')}
            </Text>
            <TextInput
              mode="outlined"
              label={t('addStory.apiKey')}
              placeholder="AIza..."
              value={tempGeminiApiKey}
              onChangeText={setTempGeminiApiKey}
              secureTextEntry
              style={[styles.input, styles.dialogFont]}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              labelStyle={styles.dialogFont}
              onPress={() => setGeminiApiKeyDialogVisible(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button labelStyle={styles.dialogFont} onPress={handleSaveGeminiApiKey}>
              {t('common.save')}
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Ollama API Key Dialog */}
        <Dialog
          visible={ollamaApiKeyDialogVisible}
          onDismiss={() => setOllamaApiKeyDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            {hasOllamaApiKey() ? t('settingsScreen.changeOllama') : t('aiConfig.setOllama')}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={[styles.dialogText, styles.dialogFont]}>
              {t('settingsScreen.enterOllama')}
            </Text>
            <TextInput
              mode="outlined"
              label={t('settingsScreen.keyPlaceholderLabel')}
              placeholder="ollama"
              value={tempOllamaApiKey}
              onChangeText={setTempOllamaApiKey}
              secureTextEntry
              style={[styles.input, styles.dialogFont]}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              labelStyle={styles.dialogFont}
              onPress={() => setOllamaApiKeyDialogVisible(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button labelStyle={styles.dialogFont} onPress={handleSaveOllamaApiKey}>
              {t('common.save')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 16,
  },
  spacer: {
    height: 40,
  },
  dialog: {
    borderRadius: fz.rCard,
    backgroundColor: fz.card,
  },
  dialogTitle: {
    fontFamily: fz.font,
  },
  dialogFont: {
    fontFamily: fz.font,
  },
  dialogText: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
  },
});
