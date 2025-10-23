declare global {
  // These globals are attached by React Refresh during development. When the
  // runtime isn't available (for example, when running the Expo web build
  // outside of the Metro/React Refresh environment), accessing them should not
  // crash the bundle. Defining them here keeps gesture-handler and other
  // modules from throwing reference errors when the shim isn't provided.
  // eslint-disable-next-line no-var
  var $RefreshReg$: ((type: unknown, id: string) => void) | undefined;
  // eslint-disable-next-line no-var
  var $RefreshSig$: (() => (type: unknown) => unknown) | undefined;
}

if (typeof globalThis !== 'undefined') {
  if (typeof globalThis.$RefreshReg$ !== 'function') {
    globalThis.$RefreshReg$ = () => {};
  }

  if (typeof globalThis.$RefreshSig$ !== 'function') {
    globalThis.$RefreshSig$ = () => (type => type);
  }
}

export {};
