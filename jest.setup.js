// AsyncStorage needs its in-memory stand-in when there is no device attached.
// The mock ships with the package itself, at the path its own docs give.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The sound player reaches for a native module at import time, and there is
// none under jest. Every call site already treats a missing player as no sound,
// so a stand-in that does nothing is the same app with the volume off.
jest.mock('expo-audio', () => ({
  createAudioPlayer: () => ({ volume: 1, play() {}, seekTo: () => Promise.resolve(), remove() {} }),
  setAudioModeAsync: () => Promise.resolve(),
}));
