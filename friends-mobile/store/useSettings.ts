import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  apiKey: string | null;
  setApiKey: (key: string) => Promise<void>;
  loadApiKey: () => Promise<void>;
  hasApiKey: () => boolean;
}

const API_KEY_STORAGE_KEY = '@friends_api_key';

/**
 * Settings store using Zustand
 * Persists API key to AsyncStorage
 */
export const useSettings = create<SettingsState>((set, get) => ({
  apiKey: null,

  setApiKey: async (key: string) => {
    try {
      await AsyncStorage.setItem(API_KEY_STORAGE_KEY, key);
      set({ apiKey: key });
    } catch (error) {
      console.error('Failed to save API key:', error);
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
}));
