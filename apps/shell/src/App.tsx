import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { UserProvider, useUser } from '@poc-mf/contracts';

// Lazy imports resolve the remote containers at first render. The strings
// `remote_products/ProductList` and `remote_cart/Cart` are federated module
// specifiers — they are not paths on disk; Rspack's Module Federation plugin
// rewrites them at build time to fetch from the matching remoteEntry.js.
const ProductList = lazy(() => import('remote_products/ProductList'));
const Cart = lazy(() => import('remote_cart/Cart'));

type ErrorBoundaryProps = { name: string; children: ReactNode };
type ErrorBoundaryState = { error: Error | null };

/**
 * Isolate a remote module so a failure there does not take the whole shell
 * down. Each panel gets its own boundary.
 */
class RemoteErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    // eslint-disable-next-line no-console
    console.error(`[shell] Remote "${this.props.name}" failed to load:`, error);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="panel panel--error">
          <strong>Failed to load remote “{this.props.name}”.</strong>
          <p>Is its dev server running?</p>
          <pre>{this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Lives inside <UserProvider> so the shell's own chrome can drive the same
 * UserContext both remotes read from. This is the whole point of the
 * `@poc-mf/contracts` singleton: identical React context identity in all
 * three bundles.
 */
function AuthControl() {
  const { user, signIn, signOut } = useUser();

  if (user) {
    return (
      <span>
        Signed in as <strong>{user.name}</strong>
        {user.premium && ' (premium)'}{' '}
        <button type="button" onClick={signOut}>
          Sign out
        </button>
      </span>
    );
  }

  return (
    <span>
      Not signed in.{' '}
      <button type="button" onClick={() => signIn({ name: 'Ada Lovelace', premium: false })}>
        Sign in
      </button>{' '}
      <button type="button" onClick={() => signIn({ name: 'Grace Hopper', premium: true })}>
        Sign in (premium)
      </button>
    </span>
  );
}

function Layout() {
  const [shellClicks, setShellClicks] = useState(0);

  return (
    <div className="layout">
      <header className="header">
        <h1>App Shell</h1>
        <p>
          Host running on <code>:3000</code>. Shell click count:{' '}
          <button type="button" onClick={() => setShellClicks((n) => n + 1)}>
            {shellClicks}
          </button>
        </p>
        <p>
          <AuthControl />
        </p>
      </header>

      <main className="panels">
        <section className="panel">
          <h2>Remote: products</h2>
          <RemoteErrorBoundary name="remote_products">
            <Suspense fallback={<p>Loading products…</p>}>
              <ProductList />
            </Suspense>
          </RemoteErrorBoundary>
        </section>

        <section className="panel">
          <h2>Remote: cart</h2>
          <RemoteErrorBoundary name="remote_cart">
            <Suspense fallback={<p>Loading cart…</p>}>
              <Cart />
            </Suspense>
          </RemoteErrorBoundary>
        </section>
      </main>
    </div>
  );
}

export function App() {
  return (
    <UserProvider>
      <Layout />
    </UserProvider>
  );
}
