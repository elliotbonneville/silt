/**
 * Item event renderer (pickup/drop)
 */

import './events.css';

interface ItemEventProps {
  readonly content: string;
  readonly color: string;
}

export function ItemEvent({ content, color }: ItemEventProps): JSX.Element {
  return (
    <div className="event-container">
      <div className="item-event" style={{ color }}>
        {content}
      </div>
    </div>
  );
}
