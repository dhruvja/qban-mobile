const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: require.resolve("expo-crypto"),
};

// Add "browser" to unstable_conditionNames so packages like jose use browser builds
config.resolver.unstable_conditionNames = [
  "browser",
  "require",
  "react-native",
];

// Force viem to use its CJS build instead of .ts source files
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "viem" || moduleName.startsWith("viem/")) {
    const suffix = moduleName === "viem" ? "" : moduleName.slice(4);
    const cjsPath = path.join(
      __dirname,
      "node_modules",
      "viem",
      "_cjs",
      suffix || "index.js"
    );
    return {
      filePath: cjsPath.endsWith(".js") ? cjsPath : cjsPath + "/index.js",
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
