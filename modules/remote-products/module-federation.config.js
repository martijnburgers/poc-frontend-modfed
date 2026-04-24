// @ts-check
const pkg = require('./package.json');

/**
 * Module Federation config for the `remote_products` module.
 *
 * Exposes a single `./ProductList` entry that the shell (or any other host)
 * can consume as `remote_products/ProductList`.
 */
module.exports = {
  name: 'remote_products',
  filename: 'remoteEntry.js',
  exposes: {
    './ProductList': './src/ProductList.tsx',
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
