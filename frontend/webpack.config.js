/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
process.env.EXPO_ROUTER_APP_ROOT =
  process.env.EXPO_ROUTER_APP_ROOT || path.resolve(__dirname, 'app');
process.env.EXPO_ROUTER_IMPORT_MODE =
  process.env.EXPO_ROUTER_IMPORT_MODE || 'sync';

const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  config.plugins = config.plugins || [];
  config.plugins.push(
    new webpack.DefinePlugin({
      'process.env.EXPO_ROUTER_APP_ROOT': JSON.stringify(
        process.env.EXPO_ROUTER_APP_ROOT,
      ),
      'process.env.EXPO_PUBLIC_USE_MOCKS': JSON.stringify(
        process.env.EXPO_PUBLIC_USE_MOCKS || '',
      ),
      'process.env.EXPO_ROUTER_IMPORT_MODE': JSON.stringify(
        process.env.EXPO_ROUTER_IMPORT_MODE,
      ),
    }),
  );

  config.plugins.push(
    new CopyWebpackPlugin({
      patterns: [
        {
          from: require.resolve('msw/mockServiceWorker.js'),
          to: 'mockServiceWorker.js',
        },
      ],
    }),
  );

  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    '@': path.resolve(__dirname, 'src'),
    '@api': path.resolve(__dirname, 'src/lib/api'),
    'expo-router/entry': path.resolve(__dirname, 'web/emptyEntry.ts'),
  };

  return config;
};
