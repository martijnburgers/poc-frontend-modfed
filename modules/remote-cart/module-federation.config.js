// @ts-check
const pkg = require('./package.json');

/**
 * Module Federation config for the `remote_cart` module.
 *
 * Exposes a single `./Cart` entry that the shell (or any other host) can
 * consume as `remote_cart/Cart`.
 */
module.exports = {
  name: 'remote_cart',
  filename: 'remoteEntry.js',
  exposes: {
    './Cart': './src/Cart.tsx',
  },
  shared: {
    react: {
      singleton: true,
      requiredVersion: pkg.dependencies.react,
    },
    'react-dom': {
      singleton: true,
      requiredVersion: pkg.dependencies['react-dom'],
    },
    // Consume the same UserContext instance as the host. Not eager because
    // this remote is always loaded through an async boundary.
    '@poc-mf/contracts': {
      singleton: true,
      requiredVersion: false,
    },
  },
};
