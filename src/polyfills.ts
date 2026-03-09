// Must be imported before anything else
// Provides crypto.getRandomValues on `global.crypto` for Hermes
import "react-native-get-random-values";

// Verify and log crypto polyfill status
if (typeof global !== "undefined" && (global as Record<string, unknown>).crypto) {
  console.log("[polyfill] global.crypto is set, getRandomValues:", typeof (global as { crypto?: { getRandomValues?: unknown } }).crypto?.getRandomValues);
} else {
  console.error("[polyfill] global.crypto is NOT set after react-native-get-random-values import");
  // Manually create crypto object as fallback
  (global as Record<string, unknown>).crypto = {} as Crypto;
}

// Some RN environments have global !== globalThis
if (typeof globalThis !== "undefined" && !(globalThis as Record<string, unknown>).crypto) {
  console.log("[polyfill] Setting globalThis.crypto = global.crypto");
  Object.defineProperty(globalThis, "crypto", {
    value: (global as Record<string, unknown>).crypto,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}
