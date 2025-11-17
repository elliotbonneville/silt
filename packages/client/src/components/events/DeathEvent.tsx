/**
 * Death event renderer with special visual treatment
 */

import './events.css';

interface DeathEventProps {
  readonly content: string;
  readonly color: string;
}

export function DeathEvent({ content, color }: DeathEventProps): JSX.Element {
  const lines = content.split('\n');

  return (
    <div className="event-container event-container--death">
      <div
        className="death-event"
        style={{
          color,
          backgroundColor: `${color}10`,
          borderLeftColor: color,
        }}
      >
        {lines.map((line, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Lines are immutable parts of event content
          <div key={`death-${idx}`}>{line || '\u00A0'}</div>
        ))}
      </div>
    </div>
  );
}
