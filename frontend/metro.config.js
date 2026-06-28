// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// Use a stable on-disk store (shared across web/android)
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];

// Redirect expo-linear-gradient to a plain View shim on native to avoid
// iOS 26 CoreGraphics crash (_blt_shade_samples_noise in UIBlurEffect/shading)
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'expo-linear-gradient': path.resolve(__dirname, 'src/components/LinearGradientShim.tsx'),
};

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

module.exports = config;
// config.resolver.blacklistRE = /(.*)\/(__tests__|android|ios|build|dist|.git|node_modules\/.*\/android|node_modules\/.*\/ios|node_modules\/.*\/windows|node_modules\/.*\/macos)(\/.*)?$/;

// // Alternative: use a more aggressive exclusion pattern
// config.resolver.blacklistRE = /node_modules\/.*\/(android|ios|windows|macos|__tests__|\.git|.*\.android\.js|.*\.ios\.js)$/;

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

module.exports = config;
