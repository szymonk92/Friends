import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeColor = 'violet' | 'blue' | 'green' | 'rose' | 'orange' | 'teal';

export const THEME_COLORS: Record<ThemeColor, string> = {
  violet: '#8b5cf6',
  blue: '#3b82f6',
  green: '#10b981',
  rose: '#f43f5e',
  orange: '#f97316',
  teal: '#14b8a6',
};

interface SettingsState {
  apiKey: string | null;
  themeColor: ThemeColor;
  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
  loadApiKey: () => Promise<void>;
  hasApiKey: () => boolean;
  setThemeColor: (color: ThemeColor) => Promise<void>;
  loadThemeColor: () => Promise<void>;
  getThemeColorValue: () => string;
}

const API_KEY_STORAGE_KEY = '@friends_api_key';
const THEME_COLOR_STORAGE_KEY = '@friends_theme_color';

/**
 * Settings store using Zustand
 * Persists API key to AsyncStorage
 */
export const useSettings = create<SettingsState>((set, get) => ({
  apiKey: null,
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
