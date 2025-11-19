/**
 * Event propagator calculates which actors should receive which events
 * based on distance and event type
 */

import type { GameEvent } from '@silt/shared';
import { EVENT_RANGES } from '@silt/shared';
import type { Server } from 'socket.io';
import { findCharacterById, findCharactersInRoom } from '../database/character-repository.js';
import { saveGameEvent } from '../database/event-repository.js';
import { createPlayerLog } from '../database/player-log-repository.js';
import type { AIAgentManager } from './ai-agent-manager.js';
import type { CharacterManager } from './character-manager.js';
import { getRoomsWithinDistance } from './event-distance.js';
import { formatEventContent } from './event-formatter.js';

import type { GameSystem, TickContext } from './systems/game-loop.js';

export class EventPropagator implements GameSystem {
  private eventQueue: GameEvent[] = [];

  constructor(
    private readonly characterManager: CharacterManager,
    private readonly aiAgentManager: AIAgentManager,
    private readonly io?: Server,
  ) {}

  /**
   * Game System Tick - Process queued events
   */
  onTick(_context: TickContext): void {
    this.flushQueue().catch((error) => {
      console.error('Error flushing event queue:', error);
    });
  }

  private async flushQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = []; // Clear queue immediately

    // Process all events
    // Note: sequential processing to ensure order is preserved
    for (const event of events) {
      await this.processEvent(event);
    }
  }

  /**
   * Calculate which actors (players + AI agents) should receive an event
   * Returns Map of actorId → event (potentially modified for distance)
   */
  async calculateAffectedActors(event: GameEvent): Promise<Map<string, GameEvent>> {
    const affected = new Map<string, GameEvent>();
    const range = this.getEventRange(event.type);

    const roomsInRange = await getRoomsWithinDistance(event.originRoomId, range);

    for (const [roomId, distance] of roomsInRange) {
      // Query Prisma for characters in this room
      const charactersInRoom = await findCharactersInRoom(roomId);
      const attenuatedEvent = this.attenuateEvent(event, distance);

      for (const character of charactersInRoom) {
        affected.set(character.id, attenuatedEvent);
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
   * Broadcast an event (Queues it for next tick)
   */
  async broadcast(event: GameEvent): Promise<void> {
    this.eventQueue.push(event);
  }

  /**
   * Process a single event (Internal logic, formerly broadcast)
   */
  private async processEvent(event: GameEvent): Promise<void> {
    // Persist ALL events to database (including AI events)
    saveGameEvent(event).catch((error) => {
      console.error('Failed to save event to database:', error);
    });

    // Calculate affected actors
    const affectedActors = await this.calculateAffectedActors(event);

    // Special handling for movement events: also broadcast to destination room
    if (event.type === 'movement' && event.data?.['toRoomId']) {
      const toRoomId = String(event.data['toRoomId']);
      const destinationCharacters = await findCharactersInRoom(toRoomId);

      // Add destination room actors to affected list
      for (const character of destinationCharacters) {
        if (!affectedActors.has(character.id)) {
          affectedActors.set(character.id, event);
        }
      }
    }

    // Broadcast to admin clients for monitoring (ALL events)
    // Format with omniscient perspective for admin view (no viewerActorId)
    if (this.io) {
      this.io.to('admin').emit('admin:game-event', {
        ...event,
        content: formatEventContent(event),
        recipients: Array.from(affectedActors.keys()),
      });
    }

    // Skip player delivery for AI events (only for admin visibility)
    if (event.type.startsWith('ai:')) {
      return;
    }

    // Deliver game events to players/AI agents
    for (const [actorId, attenuatedEvent] of affectedActors) {
      // Query DB to determine if this is a player or AI
      const character = await findCharacterById(actorId);
      if (!character) continue;

      // Format content for this specific recipient, including their current room
      const formattedEvent: GameEvent = {
        ...attenuatedEvent,
        content:
          attenuatedEvent.content ||
          formatEventContent(attenuatedEvent, actorId, character.currentRoomId),
      };

      // Filter out empty messages
      if (!formattedEvent.content) continue;

      // Debug: Log if we're sending "Something happened" to players
      if (formattedEvent.content === 'Something happened.' && character.accountId !== null) {
        console.warn(
          `⚠️  Sending generic "Something happened" to player ${character.name} for event type: ${event.type}`,
          event,
        );
      }

      if (character.accountId === null) {
        // AI agent - queue event
        this.aiAgentManager.queueEventForAgent(actorId, formattedEvent);
      } else {
        // Player - send via WebSocket
        const socketId = this.characterManager.getSocketIdForCharacter(actorId);
        if (socketId && this.io) {
          this.io.to(socketId).emit('game:event', formattedEvent);
          // Persist event log for player
          createPlayerLog(actorId, 'event', formattedEvent).catch((error) => {
            console.error(`Failed to log event for player ${actorId}:`, error);
          });
        }
      }
    }
  }

  /**
   * Broadcast multiple events
   */
  async broadcastMany(events: readonly GameEvent[]): Promise<void> {
    for (const event of events) {
      await this.broadcast(event);
    }
  }
}
