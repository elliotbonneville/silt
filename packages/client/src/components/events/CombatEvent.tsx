/**
 * Combat event renderer
 */

import './events.css';

interface CombatEventProps {
  readonly content: string;
  readonly color: string;
}

export function CombatEvent({ content, color }: CombatEventProps): JSX.Element | null {
  // Don't render if content is "undefined" string (defensive check)
  if (content === 'undefined') return null;

  return (
    <div className="event-container event-container--combat">
      <div className="combat-event" style={{ color }}>
        {content}
      </div>
    </div>
  );
}
