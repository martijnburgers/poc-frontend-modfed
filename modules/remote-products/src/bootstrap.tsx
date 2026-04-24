import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { UserProvider } from '@poc-mf/contracts';
import ProductList from './ProductList';

/**
 * Standalone entry: renders ProductList directly so this remote can be
 * developed and tested without the shell. Wraps in UserProvider so
 * `useUser()` doesn't throw — in production the shell supplies the provider.
 * When the shell consumes this module it imports `./ProductList` directly,
 * so this file is not part of the federated output.
 */
const container = document.getElementById('root');
if (!container) {
  throw new Error('remote_products: #root not found.');
}

createRoot(container).render(
  <StrictMode>
    <UserProvider initialUser={{ name: 'Standalone Dev', premium: true }}>
      <ProductList />
    </UserProvider>
  </StrictMode>,
);
