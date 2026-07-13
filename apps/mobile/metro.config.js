const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, "../..");
const punycodeCjs = require.resolve("punycode/punycode.js", {
  paths: [__dirname, workspaceRoot],
});

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.resolverMainFields = ["react-native", "browser", "module", "main"];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "punycode") {
    return {
      type: "sourceFile",
      filePath: punycodeCjs,
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
