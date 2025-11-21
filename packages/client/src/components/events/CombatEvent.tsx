/**
 * Combat event renderer
 */

import type { EntityReference } from '@silt/shared';
import { RichText } from './RichText.js';
import './events.css';

interface CombatEventProps {
  readonly content: string;
  readonly color: string;
  readonly relatedEntities?: readonly EntityReference[] | undefined;
  readonly onEntityClick?: ((entity: EntityReference) => void) | undefined;
}

export function CombatEvent({
  content,
  color,
  relatedEntities,
  onEntityClick,
}: CombatEventProps): JSX.Element | null {
  // Don't render if content is "undefined" string (defensive check)
  if (content === 'undefined') return null;

  return (
    <div className="event-container event-container--combat">
      <div className="combat-event" style={{ color }}>
        <RichText
          content={content}
          relatedEntities={relatedEntities}
          onEntityClick={onEntityClick}
        />
      </div>
    </div>
  );
}
