import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '../useSettings';

jest.mock('@react-native-async-storage/async-storage');

describe('useSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AI Model Selection', () => {
    it('should have default model as anthropic', () => {
      const { result } = renderHook(() => useSettings());
      expect(result.current.selectedModel).toBe('anthropic');
    });

    it('should set and persist selected model', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.setSelectedModel('gemini');
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@friends_selected_model', 'gemini');
      expect(result.current.selectedModel).toBe('gemini');
    });

    it('should load selected model from storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('gemini');

      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.loadSelectedModel();
      });

      expect(result.current.selectedModel).toBe('gemini');
    });

    it('should ignore invalid model in storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid-model');

      const { result } = renderHook(() => useSettings());
      const initialModel = result.current.selectedModel;

      await act(async () => {
        await result.current.loadSelectedModel();
      });

      expect(result.current.selectedModel).toBe(initialModel);
    });
  });

  describe('Anthropic API Key', () => {
    it('should set and persist Anthropic API key', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.setApiKey('sk-ant-test123');
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@friends_api_key', 'sk-ant-test123');
      expect(result.current.apiKey).toBe('sk-ant-test123');
    });

    it('should check if Anthropic API key exists', async () => {
      const { result } = renderHook(() => useSettings());

      expect(result.current.hasApiKey()).toBe(false);

      await act(async () => {
        await result.current.setApiKey('sk-ant-test123');
      });

      expect(result.current.hasApiKey()).toBe(true);
    });

    it('should clear Anthropic API key', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.setApiKey('sk-ant-test123');
        await result.current.clearApiKey();
      });

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@friends_api_key');
      expect(result.current.apiKey).toBeNull();
    });
  });

  describe('Gemini API Key', () => {
    it('should set and persist Gemini API key', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.setGeminiApiKey('AIzaTest123');
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@friends_gemini_api_key',
        'AIzaTest123'
      );
      expect(result.current.geminiApiKey).toBe('AIzaTest123');
    });

    it('should check if Gemini API key exists', async () => {
      const { result } = renderHook(() => useSettings());

      expect(result.current.hasGeminiApiKey()).toBe(false);

      await act(async () => {
        await result.current.setGeminiApiKey('AIzaTest123');
      });

      expect(result.current.hasGeminiApiKey()).toBe(true);
    });

    it('should clear Gemini API key', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.setGeminiApiKey('AIzaTest123');
        await result.current.clearGeminiApiKey();
      });

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@friends_gemini_api_key');
      expect(result.current.geminiApiKey).toBeNull();
    });
  });

  describe('Active API Key', () => {
    it('should return Anthropic key when model is anthropic', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.setApiKey('sk-ant-test123');
        await result.current.setSelectedModel('anthropic');
      });

      expect(result.current.getActiveApiKey()).toBe('sk-ant-test123');
    });

    it('should return Gemini key when model is gemini', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.setGeminiApiKey('AIzaTest123');
        await result.current.setSelectedModel('gemini');
      });

      expect(result.current.getActiveApiKey()).toBe('AIzaTest123');
    });

    it('should check if active API key exists', async () => {
      const { result } = renderHook(() => useSettings());

      expect(result.current.hasActiveApiKey()).toBe(false);

      await act(async () => {
        await result.current.setSelectedModel('anthropic');
        await result.current.setApiKey('sk-ant-test123');
      });

      expect(result.current.hasActiveApiKey()).toBe(true);
    });

    it('should return false if selected model has no key', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.setApiKey('sk-ant-test123');
        await result.current.setSelectedModel('gemini');
      });

      expect(result.current.hasActiveApiKey()).toBe(false);
    });
  });

  describe('Theme Color', () => {
    it('should have default theme color', () => {
      const { result } = renderHook(() => useSettings());
      expect(result.current.themeColor).toBe('violet');
    });

    it('should set and persist theme color', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.setThemeColor('blue');
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@friends_theme_color', 'blue');
      expect(result.current.themeColor).toBe('blue');
    });

    it('should get theme color value', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.setThemeColor('blue');
      });

      expect(result.current.getThemeColorValue()).toBe('#3b82f6');
    });
  });
});
