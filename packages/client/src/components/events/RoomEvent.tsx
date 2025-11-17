/**
 * Room description event renderer
 */

import type { RoomOutput } from '@silt/shared';
import './events.css';

interface RoomEventProps {
  readonly roomData: RoomOutput['data'];
  readonly colors: {
    text: string;
    roomDescription: string;
    movement: string;
  };
}

export function RoomEvent({ roomData, colors }: RoomEventProps): JSX.Element {
  return (
    <div className="room-event">
      {/* Room Name */}
      <div className="room-event__name" style={{ color: colors.roomDescription }}>
        {roomData.name}
      </div>

      {/* Room Description */}
      <div className="room-event__description" style={{ color: colors.text }}>
        {roomData.description}
      </div>

      {/* Exits */}
      {roomData.exits.length > 0 && (
        <div className="room-event__section">
          <span className="room-event__label" style={{ color: colors.text }}>
            Exits:{' '}
          </span>
          <span style={{ color: colors.movement, opacity: 0.85 }}>
            {roomData.exits.map((exit) => exit.direction).join(', ')}
          </span>
        </div>
      )}

      {/* Items */}
      {roomData.items.length > 0 && (
        <div className="room-event__section">
          <span className="room-event__label" style={{ color: colors.text }}>
            You see:{' '}
          </span>
          <span style={{ color: colors.text, opacity: 0.85 }}>
            {roomData.items.map((item) => item.name).join(', ')}
          </span>
        </div>
      )}

      {/* Occupants */}
      {roomData.occupants.length > 0 && (
        <div className="room-event__section">
          <span className="room-event__label" style={{ color: colors.text }}>
            Also here:{' '}
          </span>
          <span style={{ color: colors.text, opacity: 0.85 }}>
            {roomData.occupants.map((occupant) => occupant.name).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
}
