import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  apiKey: string | null;
  isLoading: boolean;
  setApiKey: (key: string) => Promise<void>;
  loadApiKey: () => Promise<void>;
  deleteApiKey: () => Promise<void>;
  hasApiKey: () => boolean;
}

const API_KEY_STORAGE_KEY = 'friends_api_key';
const LEGACY_ASYNC_STORAGE_KEY = '@friends_api_key';

/**
 * Check if SecureStore is available on this platform
 * SecureStore is not available on web
 */
async function isSecureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Migrate API key from AsyncStorage to SecureStore (one-time migration)
 */
async function migrateFromAsyncStorage(): Promise<string | null> {
  try {
    const legacyKey = await AsyncStorage.getItem(LEGACY_ASYNC_STORAGE_KEY);
    if (legacyKey) {
      // Store in SecureStore
      await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, legacyKey);
      // Remove from AsyncStorage
      await AsyncStorage.removeItem(LEGACY_ASYNC_STORAGE_KEY);
      return legacyKey;
    }
  } catch {
    // Migration failed, but don't block the app
  }
  return null;
}

/**
 * Settings store using Zustand
 * Persists API key to SecureStore (encrypted) on native platforms
 * Falls back to AsyncStorage on web (with warning)
 *
 * SECURITY: SecureStore uses:
 * - iOS: Keychain Services
 * - Android: Android Keystore + encrypted SharedPreferences
 */
export const useSettings = create<SettingsState>((set, get) => ({
  apiKey: null,
  isLoading: false,

  setApiKey: async (key: string) => {
    set({ isLoading: true });
    try {
      const secureAvailable = await isSecureStoreAvailable();

      if (secureAvailable) {
        await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, key, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        });
      } else {
        // Web fallback - warn about reduced security
        if (__DEV__ && Platform.OS === 'web') {
          // eslint-disable-next-line no-console
          console.warn(
            '[Security] SecureStore not available on web. API key stored with reduced security.'
          );
        }
        await AsyncStorage.setItem(LEGACY_ASYNC_STORAGE_KEY, key);
      }

      set({ apiKey: key, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw new Error(
        `Failed to save API key securely: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  loadApiKey: async () => {
    set({ isLoading: true });
    try {
      const secureAvailable = await isSecureStoreAvailable();
      let key: string | null = null;

      if (secureAvailable) {
        // Try to load from SecureStore
        key = await SecureStore.getItemAsync(API_KEY_STORAGE_KEY);

        // If not found, check for legacy AsyncStorage key and migrate
        if (!key) {
          key = await migrateFromAsyncStorage();
        }
      } else {
        // Web fallback
        key = await AsyncStorage.getItem(LEGACY_ASYNC_STORAGE_KEY);
      }

      set({ apiKey: key, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      // Don't throw - just log and continue with null key
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load API key:', error);
      }
    }
  },

  deleteApiKey: async () => {
    set({ isLoading: true });
    try {
      const secureAvailable = await isSecureStoreAvailable();

      if (secureAvailable) {
        await SecureStore.deleteItemAsync(API_KEY_STORAGE_KEY);
      }
      // Always try to clean up AsyncStorage (for migration cleanup)
      await AsyncStorage.removeItem(LEGACY_ASYNC_STORAGE_KEY);

      set({ apiKey: null, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw new Error(
        `Failed to delete API key: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  hasApiKey: () => {
    const state = get();
    return !!state.apiKey && state.apiKey.trim().length > 0;
  },
}));
