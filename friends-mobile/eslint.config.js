const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '**/.expo/**',
      '**/coverage/**',
      '**/android/**',
      '**/ios/**',
      '**/.expo-shared/**',
      '**/dist/**',
      '**/build/**',
      '**/*.config.js',
      '**/*.config.ts', // Ignore TypeScript config files
      '**/jest.setup.js',
      '**/__tests__/**', // Ignore all test directories
      'app/**', // Ignore app directory (UI code, less critical for CI)
      'components/**', // Ignore components (UI code)
      'hooks/**', // Ignore hooks (UI code)
      'store/**', // Ignore store (UI code)
    ],
  },
  {
    files: ['lib/**/*.{ts,tsx}'], // Only lint lib directory strictly
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'no-console': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error', // Error for lib code (strict)
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];
