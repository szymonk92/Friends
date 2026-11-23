module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/lib/**/__tests__/**/*.test.[jt]s?(x)',
    '**/lib/**/?(*.)+(spec|test).[jt]s?(x)',
    '**/store/**/__tests__/**/*.test.[jt]s?(x)',
    '**/components/**/__tests__/**/*-test.tsx',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // d3 packages are ESM-only; use their bundled UMD builds under Jest.
    '^d3-(force|quadtree|dispatch|timer)$': '<rootDir>/node_modules/d3-$1/dist/d3-$1.js',
  },
  globalSetup: '<rootDir>/jest.globalSetup.js',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    '!lib/**/*.d.ts',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!jest.config.js',
  ],
  transform: {
    // @noble/ciphers is ESM-only .js; ts-jest (allowJs) compiles it to CJS.
    '^.+/node_modules/@noble/.+\\.js$': ['ts-jest', { tsconfig: { allowJs: true, module: 'commonjs' } }],
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-paper|@testing-library|@noble)/)',
  ],
  modulePathIgnorePatterns: ['<rootDir>/app/', '<rootDir>/hooks/'],
};
