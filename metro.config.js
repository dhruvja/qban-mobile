const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: require.resolve("expo-crypto"),
};

// Enable package exports so Privy, jose, zustand etc. resolve correctly
config.resolver.unstable_enablePackageExports = true;

// Condition names for export resolution — browser builds for jose, react-native for RN packages
config.resolver.unstable_conditionNames = [
  "react-native",
  "browser",
  "require",
];

// Packages that break with package exports — disable exports for them
config.resolver.unstable_enablePackageExports = true;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Force viem to use its CJS build instead of .ts source files
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

  // Disable package exports for packages that are incompatible
  // MWA: force React Native entry (index.native.js) instead of browser entry
  if (
    moduleName === "isows" ||
    moduleName.startsWith("isows/") ||
    moduleName === "@solana-mobile/mobile-wallet-adapter-protocol" ||
    moduleName.startsWith("@solana-mobile/mobile-wallet-adapter-protocol/") ||
    moduleName === "@solana-mobile/mobile-wallet-adapter-protocol-web3js" ||
    moduleName.startsWith("@solana-mobile/mobile-wallet-adapter-protocol-web3js/")
  ) {
    return context.resolveRequest(
      { ...context, unstable_enablePackageExports: false },
      moduleName,
      platform
    );
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
