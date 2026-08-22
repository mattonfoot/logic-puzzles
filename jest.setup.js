// AsyncStorage needs its in-memory stand-in when there is no device attached.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);
