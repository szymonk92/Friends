import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeColor = 'violet' | 'blue' | 'green' | 'rose' | 'orange' | 'teal';
export type AIModel = 'anthropic' | 'gemini';

export const THEME_COLORS: Record<ThemeColor, string> = {
  violet: '#8b5cf6',
  blue: '#3b82f6',
  green: '#10b981',
  rose: '#f43f5e',
  orange: '#f97316',
  teal: '#14b8a6',
};

export const AI_MODELS: Record<AIModel, { name: string; description: string }> = {
  anthropic: {
    name: 'Claude 3.5 Sonnet',
    description: 'Anthropic Claude - High quality analysis',
  },
  gemini: {
    name: 'Gemini 2.5 Flash Lite',
    description: 'Google Gemini - Fast and efficient',
  },
};

interface SettingsState {
  apiKey: string | null;
  geminiApiKey: string | null;
  selectedModel: AIModel;
  themeColor: ThemeColor;
  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
  loadApiKey: () => Promise<void>;
  hasApiKey: () => boolean;
  setGeminiApiKey: (key: string) => Promise<void>;
  clearGeminiApiKey: () => Promise<void>;
  loadGeminiApiKey: () => Promise<void>;
  hasGeminiApiKey: () => boolean;
  setSelectedModel: (model: AIModel) => Promise<void>;
  loadSelectedModel: () => Promise<void>;
  getActiveApiKey: () => string | null;
  hasActiveApiKey: () => boolean;
  setThemeColor: (color: ThemeColor) => Promise<void>;
  loadThemeColor: () => Promise<void>;
  getThemeColorValue: () => string;
}

const API_KEY_STORAGE_KEY = '@friends_api_key';
const GEMINI_API_KEY_STORAGE_KEY = '@friends_gemini_api_key';
const SELECTED_MODEL_STORAGE_KEY = '@friends_selected_model';
const THEME_COLOR_STORAGE_KEY = '@friends_theme_color';

/**
 * Settings store using Zustand
 * Persists API key to AsyncStorage
 */
export const useSettings = create<SettingsState>((set, get) => ({
  apiKey: null,
  geminiApiKey: null,
  selectedModel: 'anthropic',
  themeColor: 'violet',

  setApiKey: async (key: string) => {
    try {
      await AsyncStorage.setItem(API_KEY_STORAGE_KEY, key);
      set({ apiKey: key });
    } catch (error) {
      console.error('Failed to save API key:', error);
      throw error;
    }
  },

  clearApiKey: async () => {
    try {
      await AsyncStorage.removeItem(API_KEY_STORAGE_KEY);
      set({ apiKey: null });
    } catch (error) {
      console.error('Failed to clear API key:', error);
      throw error;
    }
  },

  loadApiKey: async () => {
    try {
      const key = await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
      set({ apiKey: key });
    } catch (error) {
      console.error('Failed to load API key:', error);
    }
  },

  hasApiKey: () => {
    const state = get();
    return !!state.apiKey && state.apiKey.trim().length > 0;
  },

  setGeminiApiKey: async (key: string) => {
    try {
      await AsyncStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, key);
      set({ geminiApiKey: key });
    } catch (error) {
      console.error('Failed to save Gemini API key:', error);
      throw error;
    }
  },

  clearGeminiApiKey: async () => {
    try {
      await AsyncStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
      set({ geminiApiKey: null });
    } catch (error) {
      console.error('Failed to clear Gemini API key:', error);
      throw error;
    }
  },

  loadGeminiApiKey: async () => {
    try {
      const key = await AsyncStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
      set({ geminiApiKey: key });
    } catch (error) {
      console.error('Failed to load Gemini API key:', error);
    }
  },

  hasGeminiApiKey: () => {
    const state = get();
    return !!state.geminiApiKey && state.geminiApiKey.trim().length > 0;
  },

  setSelectedModel: async (model: AIModel) => {
    try {
      await AsyncStorage.setItem(SELECTED_MODEL_STORAGE_KEY, model);
      set({ selectedModel: model });
    } catch (error) {
      console.error('Failed to save selected model:', error);
      throw error;
    }
  },

  loadSelectedModel: async () => {
    try {
      const model = await AsyncStorage.getItem(SELECTED_MODEL_STORAGE_KEY);
      if (model === 'anthropic' || model === 'gemini') {
        set({ selectedModel: model });
      }
    } catch (error) {
      console.error('Failed to load selected model:', error);
    }
  },

  getActiveApiKey: () => {
    const state = get();
    return state.selectedModel === 'anthropic' ? state.apiKey : state.geminiApiKey;
  },

  hasActiveApiKey: () => {
    const state = get();
    const key = state.selectedModel === 'anthropic' ? state.apiKey : state.geminiApiKey;
    return !!key && key.trim().length > 0;
  },

  setThemeColor: async (color: ThemeColor) => {
    try {
      await AsyncStorage.setItem(THEME_COLOR_STORAGE_KEY, color);
      set({ themeColor: color });
    } catch (error) {
      console.error('Failed to save theme color:', error);
      throw error;
    }
  },

  loadThemeColor: async () => {
    try {
      const color = await AsyncStorage.getItem(THEME_COLOR_STORAGE_KEY);
      if (color && color in THEME_COLORS) {
        set({ themeColor: color as ThemeColor });
      }
    } catch (error) {
      console.error('Failed to load theme color:', error);
    }
  },

  getThemeColorValue: () => {
    const state = get();
    return THEME_COLORS[state.themeColor];
  },
}));
