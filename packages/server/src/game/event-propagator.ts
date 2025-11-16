/**
 * Event propagator calculates which actors should receive which events
 * based on distance and event type
 */

import type { GameEvent } from '@silt/shared';
import { EVENT_RANGES } from '@silt/shared';
import type { Server } from 'socket.io';
import { saveGameEvent } from '../database/event-repository.js';
import type { ActorRegistry } from './actor-registry.js';
import { formatEventContent, formatEventOmniscient } from './event-formatter.js';
import type { RoomGraph } from './room-graph.js';

export class EventPropagator {
  constructor(
    private readonly roomGraph: RoomGraph,
    private readonly actorRegistry: ActorRegistry,
    private readonly io?: Server,
  ) {}

  /**
   * Calculate which actors (players + AI agents) should receive an event
   * Returns Map of actorId → event (potentially modified for distance)
   */
  calculateAffectedActors(event: GameEvent): Map<string, GameEvent> {
    const affected = new Map<string, GameEvent>();
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

  /**
   * Broadcast an event to all affected actors (polymorphic delivery)
   * Formats event content per-recipient for personalized messaging
   */
  broadcast(event: GameEvent): void {
    // Persist ALL events to database (including AI events)
    saveGameEvent(event).catch((error) => {
      console.error('Failed to save event to database:', error);
    });

    // Calculate affected actors
    const affectedActors = this.calculateAffectedActors(event);

    // Special handling for movement events: also broadcast to destination room
    if (event.type === 'movement' && event.data?.['toRoomId']) {
      const toRoomId = String(event.data['toRoomId']);
      const destinationActors = this.actorRegistry.getActorsInRoom(toRoomId);

      // Add destination room actors to affected list
      for (const actorId of destinationActors) {
        if (!affectedActors.has(actorId)) {
          affectedActors.set(actorId, event);
        }
      }
    }

    // Broadcast to admin clients for monitoring (ALL events)
    // Format with omniscient perspective for admin view
    if (this.io) {
      this.io.to('admin').emit('admin:game-event', {
        ...event,
        content: formatEventOmniscient(event),
        recipients: Array.from(affectedActors.keys()),
      });
    }

    // Skip player delivery for AI events (only for admin visibility)
    if (event.type.startsWith('ai:')) {
      return;
    }

    // Deliver game events to players/AI agents
    for (const [actorId, attenuatedEvent] of affectedActors) {
      const actor = this.actorRegistry.getActor(actorId);
      if (actor) {
        // Format content for this specific recipient
        // Use existing content as fallback (gradual migration)
        const formattedEvent: GameEvent = {
          ...attenuatedEvent,
          content: attenuatedEvent.content || formatEventContent(attenuatedEvent, actorId),
        };
        actor.handleEvent(formattedEvent);
      }
    }
  }

  /**
   * Broadcast multiple events
   */
  broadcastMany(events: readonly GameEvent[]): void {
    for (const event of events) {
      this.broadcast(event);
    }
  }
}
