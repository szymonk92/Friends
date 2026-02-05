/**
 * Settings Store Tests
 *
 * Tests for the useSettings Zustand store including:
 * - API key storage and retrieval
 * - SecureStore integration
 * - Migration from AsyncStorage
 * - Error handling
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '../useSettings';

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();

  // Reset default mock implementations
  (SecureStore.isAvailableAsync as jest.Mock).mockResolvedValue(true);
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
  (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

  // Reset the store state
  useSettings.setState({ apiKey: null, isLoading: false });
});

describe('useSettings Store', () => {
  describe('Initial State', () => {
    it('should have null API key initially', () => {
      const state = useSettings.getState();
      expect(state.apiKey).toBeNull();
    });

    it('should not be loading initially', () => {
      const state = useSettings.getState();
      expect(state.isLoading).toBe(false);
    });

    it('should report hasApiKey as false when no key', () => {
      const state = useSettings.getState();
      expect(state.hasApiKey()).toBe(false);
    });
  });

  describe('setApiKey', () => {
    it('should save API key to SecureStore', async () => {
      const testKey = 'sk-ant-test-api-key-12345';

      await useSettings.getState().setApiKey(testKey);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'friends_api_key',
        testKey,
        expect.any(Object)
      );
    });

    it('should update state with new API key', async () => {
      const testKey = 'sk-ant-test-api-key-12345';

      await useSettings.getState().setApiKey(testKey);

      const state = useSettings.getState();
      expect(state.apiKey).toBe(testKey);
    });

    it('should report hasApiKey as true after setting key', async () => {
      const testKey = 'sk-ant-test-api-key-12345';

      await useSettings.getState().setApiKey(testKey);

      expect(useSettings.getState().hasApiKey()).toBe(true);
    });

    it('should set isLoading during save operation', async () => {
      // Create a delayed mock
      (SecureStore.setItemAsync as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const promise = useSettings.getState().setApiKey('test-key');

      // Should be loading
      expect(useSettings.getState().isLoading).toBe(true);

      await promise;

      // Should not be loading after completion
      expect(useSettings.getState().isLoading).toBe(false);
    });

    it('should throw error if SecureStore fails', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('SecureStore error'));

      await expect(useSettings.getState().setApiKey('test-key')).rejects.toThrow(
        'Failed to save API key securely'
      );
    });
  });

  describe('loadApiKey', () => {
    it('should load API key from SecureStore', async () => {
      const testKey = 'sk-ant-loaded-key-67890';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(testKey);

      await useSettings.getState().loadApiKey();

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('friends_api_key');
      expect(useSettings.getState().apiKey).toBe(testKey);
    });

    it('should handle missing API key', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      await useSettings.getState().loadApiKey();

      expect(useSettings.getState().apiKey).toBeNull();
    });

    it('should migrate from AsyncStorage if no key in SecureStore', async () => {
      const legacyKey = 'sk-ant-legacy-key-11111';

      // No key in SecureStore
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      // Key exists in AsyncStorage (uses LEGACY_ASYNC_STORAGE_KEY = '@friends_api_key')
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(legacyKey);

      await useSettings.getState().loadApiKey();

      // Should have the key in state (migrated from AsyncStorage)
      expect(useSettings.getState().apiKey).toBe(legacyKey);
      // Should have called AsyncStorage.getItem
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@friends_api_key');
    });

    it('should not throw error if load fails', async () => {
      // Make isAvailableAsync fail
      (SecureStore.isAvailableAsync as jest.Mock).mockRejectedValue(new Error('Not available'));

      // Should not throw - loadApiKey catches errors internally
      await useSettings.getState().loadApiKey();

      // API key should remain null (no error thrown, just logged)
      expect(useSettings.getState().apiKey).toBeNull();
    });

    it('should set isLoading during load operation', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('test-key'), 100))
      );

      const promise = useSettings.getState().loadApiKey();

      expect(useSettings.getState().isLoading).toBe(true);

      await promise;

      expect(useSettings.getState().isLoading).toBe(false);
    });
  });

  describe('deleteApiKey', () => {
    it('should delete API key from SecureStore', async () => {
      // First set a key
      useSettings.setState({ apiKey: 'test-key' });

      await useSettings.getState().deleteApiKey();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('friends_api_key');
    });

    it('should also clean up AsyncStorage', async () => {
      await useSettings.getState().deleteApiKey();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@friends_api_key');
    });

    it('should clear API key from state', async () => {
      useSettings.setState({ apiKey: 'test-key' });

      await useSettings.getState().deleteApiKey();

      expect(useSettings.getState().apiKey).toBeNull();
    });

    it('should throw error if delete fails', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(new Error('Delete error'));

      await expect(useSettings.getState().deleteApiKey()).rejects.toThrow('Failed to delete API key');
    });
  });

  describe('hasApiKey', () => {
    it('should return false for null key', () => {
      useSettings.setState({ apiKey: null });
      expect(useSettings.getState().hasApiKey()).toBe(false);
    });

    it('should return false for empty string', () => {
      useSettings.setState({ apiKey: '' });
      expect(useSettings.getState().hasApiKey()).toBe(false);
    });

    it('should return false for whitespace-only string', () => {
      useSettings.setState({ apiKey: '   ' });
      expect(useSettings.getState().hasApiKey()).toBe(false);
    });

    it('should return true for valid key', () => {
      useSettings.setState({ apiKey: 'sk-ant-valid-key' });
      expect(useSettings.getState().hasApiKey()).toBe(true);
    });
  });

  describe('API Key Format Validation', () => {
    const validKeys = [
      'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      'sk-ant-test-key-12345',
      'anthropic-api-key-format',
    ];

    const invalidKeys = ['', '   ', null];

    validKeys.forEach((key) => {
      it(`should accept valid key: ${key?.substring(0, 20)}...`, async () => {
        await useSettings.getState().setApiKey(key);
        expect(useSettings.getState().hasApiKey()).toBe(true);
      });
    });

    invalidKeys.forEach((key) => {
      it(`should not accept invalid key: ${JSON.stringify(key)}`, () => {
        useSettings.setState({ apiKey: key });
        expect(useSettings.getState().hasApiKey()).toBe(false);
      });
    });
  });

  describe('State Persistence Simulation', () => {
    it('should persist and restore API key across "sessions"', async () => {
      const testKey = 'sk-ant-persistent-key';

      // Session 1: Save key
      await useSettings.getState().setApiKey(testKey);
      expect(useSettings.getState().apiKey).toBe(testKey);

      // Simulate app restart - reset state
      useSettings.setState({ apiKey: null, isLoading: false });
      expect(useSettings.getState().apiKey).toBeNull();

      // Mock SecureStore returning the saved key
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(testKey);

      // Session 2: Load key
      await useSettings.getState().loadApiKey();
      expect(useSettings.getState().apiKey).toBe(testKey);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle rapid set/load operations', async () => {
      const keys = ['key1', 'key2', 'key3'];

      // Rapid setting
      for (const key of keys) {
        await useSettings.getState().setApiKey(key);
      }

      // Should end up with the last key
      expect(useSettings.getState().apiKey).toBe('key3');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long API keys', async () => {
      const longKey = 'sk-ant-' + 'x'.repeat(1000);

      await useSettings.getState().setApiKey(longKey);

      expect(useSettings.getState().apiKey).toBe(longKey);
    });

    it('should handle special characters in API keys', async () => {
      const specialKey = 'sk-ant-special_chars-+=/';

      await useSettings.getState().setApiKey(specialKey);

      expect(useSettings.getState().apiKey).toBe(specialKey);
    });
  });
});
