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
    // `auto` makes the remote self-aware of its own URL so the shell can
    // load its chunks from :3001 regardless of where the shell is hosted.
    publicPath: 'auto',
    uniqueName: 'remote_products',
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
    port: 3001,
    hot: true,
    headers: {
      // CORS headers are mandatory: the shell on :3000 must be allowed to
      // fetch remoteEntry.js and the code-split chunks from this origin.
      'Access-Control-Allow-Origin': '*',
    },
  },
  experiments: {
    css: true,
    // See apps/shell/rspack.config.js for the rationale: lazy compilation
    // proxies break HMR in Module Federation containers.
    lazyCompilation: false,
  },
};
