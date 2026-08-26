// AsyncStorage needs its in-memory stand-in when there is no device attached.
// The mock ships with the package itself, at the path its own docs give.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
