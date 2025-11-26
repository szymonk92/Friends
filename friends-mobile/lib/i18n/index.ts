import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import pl from './locales/pl.json';

const LANGUAGE_STORAGE_KEY = '@app_language';

// Get device locale
const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';

// Language detector plugin
const languageDetector = {
    type: 'languageDetector' as const,
    async: true,
    detect: async (callback: (lng: string) => void) => {
        try {
            // Try to get saved language from AsyncStorage
            const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
            if (savedLanguage) {
                callback(savedLanguage);
                return;
            }

            // Fall back to device language
            callback(deviceLanguage);
        } catch (error) {
            console.error('Error detecting language:', error);
            callback('en'); // Default to English on error
        }
    },
    init: () => { },
    cacheUserLanguage: async (language: string) => {
        try {
            await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
        } catch (error) {
            console.error('Error saving language:', error);
        }
    },
};

// Initialize i18next
i18n
    .use(languageDetector)
    .use(initReactI18next)
    .init({
        compatibilityJSON: 'v4', // For React Native
        resources: {
            en: { translation: en },
            pl: { translation: pl },
        },
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // React already escapes
        },
        react: {
            useSuspense: false, // Important for React Native
        },
    });

export default i18n;
