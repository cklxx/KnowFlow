/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
const actual = require('react-native/Libraries/BatchedBridge/NativeModules');

if (!actual.NativeUnimoduleProxy) {
  actual.NativeUnimoduleProxy = {
    modulesConstants: {},
    viewManagersNames: [],
    viewManagersMetadata: {},
  };
}

if (!actual.ExponentFileSystem) {
  actual.ExponentFileSystem = {};
}

if (!actual.UIManager) {
  actual.UIManager = {
    RCTView: { directEventTypes: {} },
  };
}

module.exports = actual;
