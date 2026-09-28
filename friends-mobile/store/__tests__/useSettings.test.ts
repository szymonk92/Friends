import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useSettings } from '../useSettings';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-secure-store');

const resetStore = () => {
  useSettings.setState({
    apiKey: null,
    geminiApiKey: null,
    selectedModel: 'anthropic',
    themeColor: 'violet',
    fontFamily: 'System',
    maxPhotosPerPerson: 5,
  });
};

describe('useSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  describe('AI Model Selection', () => {
    it('should have default model as anthropic', () => {
      expect(useSettings.getState().selectedModel).toBe('anthropic');
    });

    it('should set and persist selected model', async () => {
      await useSettings.getState().setSelectedModel('gemini');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@friends_selected_model', 'gemini');
      expect(useSettings.getState().selectedModel).toBe('gemini');
    });

    it('should load selected model from storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('gemini');
      await useSettings.getState().loadSelectedModel();
      expect(useSettings.getState().selectedModel).toBe('gemini');
    });

    it('should ignore invalid model in storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid-model');
      const initial = useSettings.getState().selectedModel;
      await useSettings.getState().loadSelectedModel();
      expect(useSettings.getState().selectedModel).toBe(initial);
    });
  });

  describe('Anthropic API Key', () => {
    it('should set and persist Anthropic API key', async () => {
      await useSettings.getState().setApiKey('sk-ant-test123');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('@friends_api_key', 'sk-ant-test123');
      expect(useSettings.getState().apiKey).toBe('sk-ant-test123');
    });

    it('should check if Anthropic API key exists', async () => {
      expect(useSettings.getState().hasApiKey()).toBe(false);
      await useSettings.getState().setApiKey('sk-ant-test123');
      expect(useSettings.getState().hasApiKey()).toBe(true);
    });

    it('should clear Anthropic API key', async () => {
      await useSettings.getState().setApiKey('sk-ant-test123');
      await useSettings.getState().clearApiKey();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('@friends_api_key');
      expect(useSettings.getState().apiKey).toBeNull();
    });
  });

  describe('Gemini API Key', () => {
    it('should set and persist Gemini API key', async () => {
      await useSettings.getState().setGeminiApiKey('AIzaTest123');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('@friends_gemini_api_key', 'AIzaTest123');
      expect(useSettings.getState().geminiApiKey).toBe('AIzaTest123');
    });

    it('should check if Gemini API key exists', async () => {
      expect(useSettings.getState().hasGeminiApiKey()).toBe(false);
      await useSettings.getState().setGeminiApiKey('AIzaTest123');
      expect(useSettings.getState().hasGeminiApiKey()).toBe(true);
    });

    it('should clear Gemini API key', async () => {
      await useSettings.getState().setGeminiApiKey('AIzaTest123');
      await useSettings.getState().clearGeminiApiKey();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('@friends_gemini_api_key');
      expect(useSettings.getState().geminiApiKey).toBeNull();
    });
  });

  describe('Active API Key', () => {
    it('should return Anthropic key when model is anthropic', async () => {
      await useSettings.getState().setApiKey('sk-ant-test123');
      await useSettings.getState().setSelectedModel('anthropic');
      expect(useSettings.getState().getActiveApiKey()).toBe('sk-ant-test123');
    });

    it('should return Gemini key when model is gemini', async () => {
      await useSettings.getState().setGeminiApiKey('AIzaTest123');
      await useSettings.getState().setSelectedModel('gemini');
      expect(useSettings.getState().getActiveApiKey()).toBe('AIzaTest123');
    });

    it('should check if active API key exists', async () => {
      expect(useSettings.getState().hasActiveApiKey()).toBe(false);
      await useSettings.getState().setSelectedModel('anthropic');
      await useSettings.getState().setApiKey('sk-ant-test123');
      expect(useSettings.getState().hasActiveApiKey()).toBe(true);
    });

    it('should return false if selected model has no key', async () => {
      await useSettings.getState().setApiKey('sk-ant-test123');
      await useSettings.getState().setSelectedModel('gemini');
      expect(useSettings.getState().hasActiveApiKey()).toBe(false);
    });
  });

  describe('Theme Color', () => {
    it('should have default theme color', () => {
      expect(useSettings.getState().themeColor).toBe('violet');
    });

    it('should set and persist theme color', async () => {
      await useSettings.getState().setThemeColor('blue');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@friends_theme_color', 'blue');
      expect(useSettings.getState().themeColor).toBe('blue');
    });

    it('should get theme color value', async () => {
      await useSettings.getState().setThemeColor('blue');
      expect(useSettings.getState().getThemeColorValue()).toBe('#3882ddff');
    });
  });
});
