// ponytail: Metro-only stub for @react-native-clipboard/clipboard.
// @react-buoy/shared-ui's autoDetectClipboard statically requires this module,
// so Metro must resolve it at bundle time. At runtime the expo-clipboard branch
// wins (expo-clipboard has setStringAsync), so this is never used to copy —
// these are no-ops purely to satisfy the bundler. If expo-clipboard is ever
// removed, install the real @react-native-clipboard/clipboard and delete this.
module.exports = {
  setString: () => {},
  setStringAsync: async () => {},
  getString: async () => '',
  getStringSync: () => '',
};