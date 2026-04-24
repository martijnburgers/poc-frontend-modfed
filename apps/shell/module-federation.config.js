// @ts-check
const pkg = require('./package.json');

/**
 * Module Federation config for the app shell (host).
 *
 * This shell is a pure consumer: it declares the remotes it wants to load
 * and the singletons it wants to share, but it does not expose anything.
 */
module.exports = {
  name: 'shell',
  remotes: {
    // <alias> : '<remote name>@<URL to remoteEntry.js>'
    remote_products: 'remote_products@http://localhost:3001/remoteEntry.js',
    remote_cart: 'remote_cart@http://localhost:3002/remoteEntry.js',
  },
  shared: {
    react: {
      singleton: true,
      requiredVersion: pkg.dependencies.react,
      eager: true,
    },
    'react-dom': {
      singleton: true,
      requiredVersion: pkg.dependencies['react-dom'],
      eager: true,
    },
    // Promoting @poc-mf/contracts to a runtime singleton is what makes the
    // UserContext object a stable identity across the shell + remote bundles.
    // Eager because the shell's root renders <UserProvider> during initial
    // paint and cannot wait for an async chunk to resolve first.
    '@poc-mf/contracts': {
      singleton: true,
      requiredVersion: false,
      eager: true,
    },
  },
};
