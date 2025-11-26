import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeColor = 'violet' | 'blue' | 'green' | 'rose' | 'orange' | 'teal' | 'inkWash' | 'cherry' | 'lavender';
export type AIModel = 'anthropic' | 'gemini';

export interface ColorPalette {
  primary: string;
  secondary: string;
  tertiary: string;
}

export const THEME_PALETTES: Record<ThemeColor, ColorPalette> = {
  violet: {
    primary: '#8b5cf6',
    secondary: '#ec4899', // Pink
    tertiary: '#6366f1',  // Indigo
  },
  blue: {
    primary: '#3882ddff',
    secondary: '#0ea5e9', // Sky blue
    tertiary: '#06b6d4',  // Cyan
  },
  green: {
    primary: '#10b981',
    secondary: '#14b8a6', // Teal
    tertiary: '#22c55e',  // Light green
  },
  rose: {
    primary: '#f43f5e',
    secondary: '#f97316', // Orange
    tertiary: '#ec4899',  // Pink
  },
  orange: {
    primary: '#f97316',
    secondary: '#f59e0b', // Amber
    tertiary: '#ef4444',  // Red
  },
  teal: {
    primary: '#08605F',
    secondary: '#177E89', // Teal blue
    tertiary: '#598381',  // Sage
  },
  inkWash: {
    primary: '#4A4A4A',
    secondary: '#CBCBCB', // Teal blue
    tertiary: '#FFFFF3',  // Sage
  },
  cherry: {
    primary: '#F2C7C7',
    secondary: '#F2C7C7', // Teal blue
    tertiary: '#F2C7C7',  // Sage
  },
  lavender: {
    primary: '#3882ddff',
    secondary: '#9EF0FF', // Teal blue
    tertiary: '#A4A5F5',  // Sage
  },
};

// Backward compatibility - export just primary colors
export const THEME_COLORS: Record<ThemeColor, string> = Object.entries(THEME_PALETTES).reduce(
  (acc, [key, palette]) => {
    acc[key as ThemeColor] = palette.primary;
    return acc;
  },
  {} as Record<ThemeColor, string>
);

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
  maxPhotosPerPerson: number;
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
  setMaxPhotosPerPerson: (limit: number) => Promise<void>;
  loadMaxPhotosPerPerson: () => Promise<void>;
}

const API_KEY_STORAGE_KEY = '@friends_api_key';
const GEMINI_API_KEY_STORAGE_KEY = '@friends_gemini_api_key';
const SELECTED_MODEL_STORAGE_KEY = '@friends_selected_model';
const THEME_COLOR_STORAGE_KEY = '@friends_theme_color';
const MAX_PHOTOS_PER_PERSON_STORAGE_KEY = '@friends_max_photos_per_person';

/**
 * Settings store using Zustand
 * Persists API key to AsyncStorage
 */
export const useSettings = create<SettingsState>((set, get) => ({
  apiKey: null,
  geminiApiKey: null,
  selectedModel: 'anthropic',
  themeColor: 'violet',
  maxPhotosPerPerson: 5,

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

  setMaxPhotosPerPerson: async (limit: number) => {
    try {
      if (limit < 1 || limit > 100) {
        throw new Error('Photo limit must be between 1 and 100');
      }
      await AsyncStorage.setItem(MAX_PHOTOS_PER_PERSON_STORAGE_KEY, limit.toString());
      set({ maxPhotosPerPerson: limit });
    } catch (error) {
      console.error('Failed to save max photos per person:', error);
      throw error;
    }
  },

  loadMaxPhotosPerPerson: async () => {
    try {
      const limit = await AsyncStorage.getItem(MAX_PHOTOS_PER_PERSON_STORAGE_KEY);
      if (limit) {
        const parsedLimit = parseInt(limit, 10);
        if (!isNaN(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 100) {
          set({ maxPhotosPerPerson: parsedLimit });
        }
      }
    } catch (error) {
      console.error('Failed to load max photos per person:', error);
    }
  },
}));
