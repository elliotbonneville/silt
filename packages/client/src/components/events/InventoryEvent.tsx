/**
 * Inventory display renderer
 */

import './events.css';

interface InventoryEventProps {
  readonly items: readonly {
    readonly id: string;
    readonly name: string;
    readonly isEquipped: boolean;
  }[];
  readonly color: string;
  readonly ambientColor: string;
}

export function InventoryEvent({ items, color, ambientColor }: InventoryEventProps): JSX.Element {
  if (items.length === 0) {
    return <div style={{ color: ambientColor }}>Inventory is empty.</div>;
  }

  return (
    <div style={{ color }}>
      <div className="inventory-event__title">Inventory:</div>
      {items.map((item) => (
        <div key={item.id} className="inventory-event__item" style={{ color: ambientColor }}>
          - {item.name}
          {item.isEquipped && ' (equipped)'}
        </div>
      ))}
    </div>
  );
}
