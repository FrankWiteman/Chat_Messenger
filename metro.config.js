// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure we can resolve files correctly in a hybrid environment
config.resolver.sourceExts.push('cjs');

// NOTE: Do NOT push 'svg' to sourceExts unless you have react-native-svg-transformer installed.
// Treating SVGs as source files without a transformer causes 'Invariant Violation' crashes.
// config.resolver.sourceExts.push('svg'); 

module.exports = config;
