/**
 * Combat event renderer
 */

import './events.css';

interface CombatEventProps {
  readonly content: string;
  readonly color: string;
}

export function CombatEvent({ content, color }: CombatEventProps): JSX.Element {
  return (
    <div className="event-container event-container--combat">
      <div className="combat-event" style={{ color }}>
        {content}
      </div>
    </div>
  );
}
