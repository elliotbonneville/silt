/**
 * Movement event renderer (arrivals/departures)
 */

import './events.css';

interface MovementEventProps {
  readonly content: string;
  readonly color: string;
}

export function MovementEvent({ content, color }: MovementEventProps): JSX.Element {
  return (
    <div className="movement-event" style={{ color }}>
      {content}
    </div>
  );
}
