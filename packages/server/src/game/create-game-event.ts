/**
 * Factory function for creating game events
 * Eliminates boilerplate and ensures consistent event creation
 */

import type { EntityReference, EventVisibility, GameEvent, GameEventType } from '@silt/shared';
import { nanoid } from 'nanoid';

/**
 * Create a game event with automatic ID and timestamp
 * Content is NOT included - it will be formatted per-recipient by EventPropagator
 */
export function createEvent(
  type: GameEventType,
  originRoomId: string,
  visibility: EventVisibility,
  data: Record<string, unknown>,
  relatedEntities: EntityReference[] = [],
): GameEvent {
  return {
    id: `event-${nanoid(10)}`,
    type,
    timestamp: Date.now(),
    originRoomId,
    relatedEntities,
    visibility,
    data,
  };
}
