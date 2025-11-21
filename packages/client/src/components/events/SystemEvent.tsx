/**
 * System and ambient event renderer (default fallback)
 */

import type { EntityReference } from '@silt/shared';
import { RichText } from './RichText.js';
import './events.css';

interface SystemEventProps {
  readonly content: string;
  readonly color: string;
  readonly isAmbient?: boolean | undefined;
  readonly relatedEntities?: readonly EntityReference[] | undefined;
  readonly onEntityClick?: ((entity: EntityReference) => void) | undefined;
}

export function SystemEvent({
  content,
  color,
  isAmbient = false,
  relatedEntities,
  onEntityClick,
}: SystemEventProps): JSX.Element | null {
  // Don't render if content is "undefined" string or empty (defensive check)
  if (!content || content === 'undefined') return null;

  const lines = content.split('\n');

  return (
    <div className="event-container">
      <div className={isAmbient ? 'ambient-event' : 'system-event'} style={{ color }}>
        {lines.map((line, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Lines are immutable parts of event content
          <div key={`sys-${idx}`}>
            {line ? (
              <RichText
                content={line}
                relatedEntities={relatedEntities}
                onEntityClick={onEntityClick}
              />
            ) : (
              '\u00A0'
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
