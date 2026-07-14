const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Set the project root explicitly so Metro doesn't walk up
config.projectRoot = projectRoot;

// Watch the monorepo root for shared packages
config.watchFolders = [monorepoRoot];

// Resolve modules from the mobile app's node_modules first,
// then fall back to the monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Block the root react-native from being resolved —
// force Metro to use the local version
config.resolver.blockList = [
  new RegExp(
    path.resolve(monorepoRoot, "node_modules", "react-native").replace(/[/\\]/g, "[/\\\\]") + "[/\\\\].*"
  ),
];

module.exports = config;
