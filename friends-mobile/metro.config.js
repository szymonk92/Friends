const path = require('path');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// Add .sql and .wasm files as asset extensions
config.resolver.assetExts.push('sql');
config.resolver.assetExts.push('wasm');

// Stub the optional @react-native-clipboard/clipboard peer that
// @react-buoy/shared-ui statically requires. Runtime uses expo-clipboard.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@react-native-clipboard/clipboard': path.resolve(__dirname, 'extras/stub-clipboard.js'),
};

module.exports = config;
