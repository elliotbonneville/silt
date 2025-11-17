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
  readonly textColor: string;
}

export function InventoryEvent({ items, textColor }: InventoryEventProps): JSX.Element {
  if (items.length === 0) {
    return (
      <div className="event-container">
        <div style={{ color: textColor, opacity: 0.7 }}>Inventory is empty.</div>
      </div>
    );
  }

  return (
    <div className="event-container">
      <div style={{ color: textColor }}>
        <div className="inventory-event__title">Inventory:</div>
        {items.map((item) => (
          <div key={item.id} className="inventory-event__item">
            - {item.name}
            {item.isEquipped && ' (equipped)'}
          </div>
        ))}
      </div>
    </div>
  );
}
