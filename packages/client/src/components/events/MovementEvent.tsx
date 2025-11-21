/**
 * Movement event renderer (arrivals/departures)
 */

import type { EntityReference } from '@silt/shared';
import { RichText } from './RichText.js';
import './events.css';

interface MovementEventProps {
  readonly content: string;
  readonly color: string;
  readonly relatedEntities?: readonly EntityReference[] | undefined;
  readonly onEntityClick?: ((entity: EntityReference) => void) | undefined;
}

export function MovementEvent({
  content,
  color,
  relatedEntities,
  onEntityClick,
}: MovementEventProps): JSX.Element {
  return (
    <div className="event-container">
      <div className="movement-event" style={{ color }}>
        <RichText
          content={content}
          relatedEntities={relatedEntities}
          onEntityClick={onEntityClick}
        />
      </div>
    </div>
  );
}
