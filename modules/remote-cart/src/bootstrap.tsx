import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { UserProvider } from '@poc-mf/contracts';
import Cart from './Cart';

/**
 * Standalone entry: renders Cart directly for isolated development. Wraps
 * in UserProvider so `useUser()` has context — in production the shell
 * supplies the provider. When the shell consumes this module it imports
 * `./Cart` directly and this file is not part of the host bundle.
 */
const container = document.getElementById('root');
if (!container) {
  throw new Error('remote_cart: #root not found.');
}

createRoot(container).render(
  <StrictMode>
    <UserProvider initialUser={{ name: 'Standalone Dev', premium: true }}>
      <Cart />
    </UserProvider>
  </StrictMode>,
);
