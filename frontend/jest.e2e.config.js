module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/e2e/**/*.test.ts?(x)'],
  setupFiles: ['react-native-gesture-handler/jestSetup', '<rootDir>/jest.preload.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testTimeout: 30000,
  transformIgnorePatterns: [
    'node_modules/(?!(?:react-native|@react-native|@react-navigation|@expo|expo|expo-asset|expo-router|expo-modules-core|@expo/vector-icons|@unimodules|unimodules|sentry-expo|native-base|msw|react-native-gesture-handler|expo-status-bar)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@api$': '<rootDir>/src/lib/api/index',
    '^@api/(.*)$': '<rootDir>/src/lib/api/$1',
    'react-native/Libraries/BatchedBridge/NativeModules': '<rootDir>/jest.nativeModulesMock.js',
  },
};
