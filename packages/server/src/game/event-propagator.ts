/**
 * Event propagator calculates which actors should receive which events
 * based on distance and event type
 */

import type { ActorId, GameEvent } from '@silt/shared';
import { EVENT_RANGES } from '@silt/shared';
import type { ActorRegistry } from './actor-registry.js';
import type { RoomGraph } from './room-graph.js';

export class EventPropagator {
  constructor(
    private readonly roomGraph: RoomGraph,
    private readonly actorRegistry: ActorRegistry,
  ) {}

  /**
   * Calculate which actors (players + AI agents) should receive an event
   * Returns Map of actorId → event (potentially modified for distance)
   */
  calculateAffectedActors(event: GameEvent): Map<ActorId, GameEvent> {
    const affected = new Map<ActorId, GameEvent>();
    const range = this.getEventRange(event.type);

    const roomsInRange = this.roomGraph.getRoomsWithinDistance(event.originRoomId, range);

    for (const [roomId, distance] of roomsInRange) {
      const actorsInRoom = this.actorRegistry.getActorsInRoom(roomId);
      const attenuatedEvent = this.attenuateEvent(event, distance);

      for (const actorId of actorsInRoom) {
        affected.set(actorId, attenuatedEvent);
      }
    }

    return affected;
  }

  private isValidEventType(type: string): type is keyof typeof EVENT_RANGES {
    return type in EVENT_RANGES;
  }

  private getEventRange(eventType: string): number {
    if (this.isValidEventType(eventType)) {
      return EVENT_RANGES[eventType];
    }
    return 0;
  }

  private attenuateEvent(event: GameEvent, distance: number): GameEvent {
    if (distance === 0) {
      return event;
    }

    switch (event.type) {
      case 'combat_start':
        return {
          ...event,
          type: 'ambient',
          content:
            distance === 1
              ? 'You hear sounds of combat nearby.'
              : 'You hear distant sounds of fighting.',
          attenuated: true,
        };

      case 'death':
        return {
          ...event,
          type: 'ambient',
          content:
            distance === 1
              ? 'A death scream echoes from nearby.'
              : 'You hear a faint scream in the distance.',
          attenuated: true,
        };

      case 'shout': {
        const newContent =
          distance === 1 ? event.content : `You hear a distant shout: ${event.content || ''}`;

        return {
          ...event,
          ...(newContent ? { content: newContent } : {}),
          attenuated: true,
        };
      }

      default:
        return event;
    }
  }
}
