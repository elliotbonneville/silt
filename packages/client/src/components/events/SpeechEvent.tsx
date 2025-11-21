/**
 * Speech and shout event renderer
 */

import type { EntityReference } from '@silt/shared';
import { RichText } from './RichText.js';
import './events.css';

interface SpeechEventProps {
  readonly content: string;
  readonly color: string;
  readonly relatedEntities?: readonly EntityReference[] | undefined;
  readonly onEntityClick?: ((entity: EntityReference) => void) | undefined;
}

export function SpeechEvent({
  content,
  color,
  relatedEntities,
  onEntityClick,
}: SpeechEventProps): JSX.Element {
  return (
    <div className="event-container event-container--speech">
      <div className="speech-event" style={{ color }}>
        <RichText
          content={content}
          relatedEntities={relatedEntities}
          onEntityClick={onEntityClick}
        />
      </div>
    </div>
  );
}
