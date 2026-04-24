import { useState } from 'react';
import { useUser } from '@poc-mf/contracts';

type Product = { id: string; name: string; price: number };

const CATALOG: readonly Product[] = [
  { id: 'p1', name: 'Mechanical keyboard', price: 129 },
  { id: 'p2', name: 'Ergonomic mouse', price: 59 },
  { id: 'p3', name: 'USB-C dock', price: 179 },
];

const PREMIUM_DISCOUNT = 0.1;

/**
 * Exposed component: consumed by the shell as `remote_products/ProductList`.
 * Reads the current user from the shell-owned UserContext via the shared
 * `@poc-mf/contracts` module so premium members see a discounted price.
 */
export default function ProductList() {
  const [selected, setSelected] = useState<string | null>(null);
  const { user } = useUser();
  const isPremium = user?.premium === true;

  return (
    <div>
      {user ? (
        <p style={{ margin: '0 0 8px', fontSize: 13, color: '#9aa0a6' }}>
          Hi {user.name}.{' '}
          {isPremium
            ? `You have a ${Math.round(PREMIUM_DISCOUNT * 100)}% premium discount on every item.`
            : 'Upgrade to premium for a discount on every item.'}
        </p>
      ) : (
        <p style={{ margin: '0 0 8px', fontSize: 13, color: '#9aa0a6' }}>
          Sign in from the shell to see personalised pricing.
        </p>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {CATALOG.map((product) => {
          const isSelected = product.id === selected;
          const effectivePrice = isPremium
            ? product.price * (1 - PREMIUM_DISCOUNT)
            : product.price;
          return (
            <li key={product.id} style={{ marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => setSelected(isSelected ? null : product.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 4,
                  border: `1px solid ${isSelected ? '#2b7bff' : '#333'}`,
                  background: isSelected ? '#1a2a4a' : 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                  font: 'inherit',
                }}
              >
                <strong>{product.name}</strong>{' '}
                {isPremium ? (
                  <span style={{ opacity: 0.85 }}>
                    — <s style={{ opacity: 0.5 }}>${product.price}</s> ${effectivePrice.toFixed(2)}
                  </span>
                ) : (
                  <span style={{ opacity: 0.7 }}>— ${product.price}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p style={{ marginTop: 12, fontSize: 13, color: '#9aa0a6' }}>
        {selected ? `Selected: ${selected}` : 'No product selected.'}
      </p>
    </div>
  );
}
