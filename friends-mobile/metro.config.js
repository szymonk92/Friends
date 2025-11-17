const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add .sql and .wasm files as asset extensions
config.resolver.assetExts.push('sql');
config.resolver.assetExts.push('wasm');

module.exports = config;
