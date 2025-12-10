const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// Add .sql and .wasm files as asset extensions
config.resolver.assetExts.push('sql');
config.resolver.assetExts.push('wasm');

module.exports = config;
