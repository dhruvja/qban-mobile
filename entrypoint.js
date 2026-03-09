// Polyfills must be imported BEFORE expo-router/entry
// See: https://docs.privy.io/basics/react-native/installation
import "fast-text-encoding";
import "react-native-get-random-values";
import "@ethersproject/shims";
import { Buffer } from "buffer";
global.Buffer = Buffer;

import "expo-router/entry";
