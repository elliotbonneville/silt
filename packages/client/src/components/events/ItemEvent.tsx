/**
 * Item event renderer (pickup/drop)
 */

import type { EntityReference } from '@silt/shared';
import { RichText } from './RichText.js';
import './events.css';

interface ItemEventProps {
  readonly content: string;
  readonly color: string;
  readonly relatedEntities?: readonly EntityReference[] | undefined;
  readonly onEntityClick?: ((entity: EntityReference) => void) | undefined;
}

export function ItemEvent({
  content,
  color,
  relatedEntities,
  onEntityClick,
}: ItemEventProps): JSX.Element {
  return (
    <div className="event-container">
      <div className="item-event" style={{ color }}>
        <RichText
          content={content}
          relatedEntities={relatedEntities}
          onEntityClick={onEntityClick}
        />
      </div>
    </div>
  );
}
