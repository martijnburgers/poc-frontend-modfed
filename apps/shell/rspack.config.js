// @ts-check
const path = require('path');
const rspack = require('@rspack/core');
const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');
const ReactRefreshPlugin = require('@rspack/plugin-react-refresh');
const mfConfig = require('./module-federation.config');

const isDev = process.env.NODE_ENV !== 'production';

/** @type {import('@rspack/core').Configuration} */
module.exports = {
  mode: isDev ? 'development' : 'production',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: 'auto',
    uniqueName: 'shell',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: { syntax: 'typescript', tsx: true },
            transform: {
              react: {
                runtime: 'automatic',
                development: isDev,
                refresh: isDev,
              },
            },
          },
        },
      },
      {
        test: /\.css$/,
        type: 'css',
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({
      template: './src/index.html',
    }),
    new ModuleFederationPlugin(mfConfig),
    isDev && new ReactRefreshPlugin(),
  ].filter(Boolean),
  devServer: {
    port: 3000,
    historyApiFallback: true,
    hot: true,
    headers: {
      // Allow the remotes (different origins) to be consumed by the shell.
      'Access-Control-Allow-Origin': '*',
    },
  },
  experiments: {
    css: true,
    // Rspack's lazy compilation emits `*!lazy-compilation-proxy` modules that
    // do not play nicely with Module Federation's per-container HMR registry:
    // a hot update for a lazy proxy tries to write into the container's
    // module map under `self.webpackHotUpdate<uniqueName>` and crashes with
    // `Cannot set properties of undefined`. Disable it — dev startup is a
    // hair slower, production builds are unaffected.
    lazyCompilation: false,
  },
};
