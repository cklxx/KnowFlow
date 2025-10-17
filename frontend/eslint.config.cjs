const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const legacyConfig = require('./.eslintrc.cjs');
const { ignorePatterns = [], ...restConfig } = legacyConfig;
const ignoredFiles = Array.isArray(ignorePatterns)
  ? [...ignorePatterns, 'eslint.config.cjs']
  : [ignorePatterns, 'eslint.config.cjs'];

module.exports = [
  {
    ignores: ignoredFiles.filter(Boolean),
  },
  ...compat.config(restConfig),
];
