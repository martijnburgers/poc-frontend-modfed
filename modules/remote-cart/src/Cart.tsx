import { useMemo, useState } from 'react';
import { useUser } from '@poc-mf/contracts';

type LineItem = { sku: string; label: string; qty: number; price: number };

const PREMIUM_DISCOUNT = 0.1;

/**
 * Exposed component: consumed by the shell as `remote_cart/Cart`.
 * Holds its own line-item state (remote-owned) but reads the signed-in user
 * from the shared UserContext so premium customers see a discounted total.
 */
export default function Cart() {
  const [items, setItems] = useState<LineItem[]>([
    { sku: 'p1', label: 'Mechanical keyboard', qty: 1, price: 129 },
    { sku: 'p3', label: 'USB-C dock', qty: 2, price: 179 },
  ]);

  const { user } = useUser();
  const isPremium = user?.premium === true;

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.qty * item.price, 0),
    [items],
  );

  const discount = isPremium ? subtotal * PREMIUM_DISCOUNT : 0;
  const total = subtotal - discount;

  function updateQty(sku: string, delta: number) {
    setItems((previous) =>
      previous
        .map((item) => (item.sku === sku ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0),
    );
  }

  if (items.length === 0) {
    return <p style={{ color: '#9aa0a6' }}>Cart is empty.</p>;
  }

  return (
    <div>
      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#9aa0a6' }}>
        {user ? `Cart for ${user.name}${isPremium ? ' (premium)' : ''}.` : 'Anonymous cart.'}
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((item) => (
          <li
            key={item.sku}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.4rem 0',
              borderBottom: '1px solid #252932',
            }}
          >
            <span>{item.label}</span>
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <button type="button" onClick={() => updateQty(item.sku, -1)} aria-label={`Remove one ${item.label}`}>
                −
              </button>
              <span style={{ minWidth: 16, textAlign: 'center' }}>{item.qty}</span>
              <button type="button" onClick={() => updateQty(item.sku, +1)} aria-label={`Add one ${item.label}`}>
                +
              </button>
              <span style={{ minWidth: 60, textAlign: 'right', opacity: 0.8 }}>
                ${item.qty * item.price}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p style={{ textAlign: 'right', marginTop: 12, lineHeight: 1.5 }}>
        Subtotal: ${subtotal}
        {isPremium && (
          <>
            <br />
            Premium discount ({Math.round(PREMIUM_DISCOUNT * 100)}%): −${discount.toFixed(2)}
          </>
        )}
        <br />
        Total: <strong>${total.toFixed(2)}</strong>
      </p>
    </div>
  );
}
