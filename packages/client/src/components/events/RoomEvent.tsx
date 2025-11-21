/**
 * Room description event renderer
 */

import type { EntityReference, RoomOutput } from '@silt/shared';
import { RichText } from './RichText.js';
import './events.css';

interface RoomEventProps {
  readonly roomData: RoomOutput['data'];
  readonly textColor: string;
  readonly accentColor: string;
  readonly onEntityClick?: ((entity: EntityReference) => void) | undefined;
}

export function RoomEvent({
  roomData,
  textColor,
  accentColor,
  onEntityClick,
}: RoomEventProps): JSX.Element {
  return (
    <div className="event-container event-container--room">
      <div className="room-event">
        {/* Room Name */}
        <div className="room-event__name" style={{ color: accentColor }}>
          {roomData.name}
        </div>

        {/* Room Description */}
        <div className="room-event__description" style={{ color: textColor }}>
          {roomData.description}
        </div>

        {/* Exits */}
        {roomData.exits.length > 0 && (
          <div className="room-event__section">
            <span className="room-event__label" style={{ color: textColor }}>
              Exits:{' '}
            </span>
            <span style={{ color: textColor, opacity: 0.85 }}>
              {roomData.exits.map((exit) => exit.direction).join(', ')}
            </span>
          </div>
        )}

        {/* Items */}
        {roomData.items.length > 0 && (
          <div className="room-event__section">
            <span className="room-event__label" style={{ color: textColor }}>
              You see:{' '}
            </span>
            <span style={{ color: textColor, opacity: 0.85 }}>
              {roomData.items.map((item) => item.name).join(', ')}
            </span>
          </div>
        )}

        {/* Occupants */}
        {roomData.occupants.length > 0 && (
          <div className="room-event__section">
            <span className="room-event__label" style={{ color: textColor }}>
              Also here:{' '}
            </span>
            <span style={{ color: textColor, opacity: 0.85 }}>
              {onEntityClick ? (
                <RichText
                  content={roomData.occupants.map((occupant) => occupant.name).join(', ')}
                  relatedEntities={roomData.occupants.map((occupant) => ({
                    id: occupant.id,
                    name: occupant.name,
                    type: 'character' as const,
                  }))}
                  onEntityClick={onEntityClick}
                />
              ) : (
                roomData.occupants.map((occupant) => occupant.name).join(', ')
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
