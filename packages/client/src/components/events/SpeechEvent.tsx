/**
 * Speech and shout event renderer
 */

import './events.css';

interface SpeechEventProps {
  readonly content: string;
  readonly color: string;
}

export function SpeechEvent({ content, color }: SpeechEventProps): JSX.Element {
  const lines = content.split('\n');

  return (
    <div className="event-container event-container--speech">
      <div className="speech-event" style={{ color }}>
        {lines.map((line, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Lines are immutable parts of event content
          <div key={`speech-${idx}`}>{line || '\u00A0'}</div>
        ))}
      </div>
    </div>
  );
}
