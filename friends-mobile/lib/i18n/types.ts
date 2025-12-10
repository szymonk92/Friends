// TypeScript type definitions for i18n
import type en from './locales/en.json';

export type TranslationKeys = typeof en;

// Augment i18next types for autocomplete
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: typeof en;
    };
    returnNull: false;
  }
}
