/**
 * Ambient module declarations for Module Federation remotes.
 *
 * Rspack does not emit real .d.ts files for federated modules without extra
 * tooling, so we declare the shapes the shell consumes here. Keep these
 * signatures in sync with the remotes' exposed components.
 */
declare module 'remote_products/ProductList' {
  import type { ComponentType } from 'react';
  const ProductList: ComponentType;
  export default ProductList;
}

declare module 'remote_cart/Cart' {
  import type { ComponentType } from 'react';
  const Cart: ComponentType;
  export default Cart;
}
