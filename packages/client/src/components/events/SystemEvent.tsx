/**
 * System and ambient event renderer (default fallback)
 */

import './events.css';

interface SystemEventProps {
  readonly content: string;
  readonly color: string;
  readonly isAmbient?: boolean;
}

export function SystemEvent({
  content,
  color,
  isAmbient = false,
}: SystemEventProps): JSX.Element | null {
  // Don't render if content is "undefined" string or empty (defensive check)
  if (!content || content === 'undefined') return null;

  const lines = content.split('\n');

  return (
    <div className="event-container">
      <div className={isAmbient ? 'ambient-event' : 'system-event'} style={{ color }}>
        {lines.map((line, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Lines are immutable parts of event content
          <div key={`sys-${idx}`}>{line || '\u00A0'}</div>
        ))}
      </div>
    </div>
  );
}
