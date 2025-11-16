/**
 * AI Debug Logger - tracks AI decisions as game events
 */

import type { GameEvent, GameEventType } from '@silt/shared';
import { nanoid } from 'nanoid';
import type { EventPropagator } from './event-propagator.js';

class AIDebugLogger {
  private eventPropagator: EventPropagator | null = null;

  setEventPropagator(propagator: EventPropagator): void {
    this.eventPropagator = propagator;
  }

  log(
    agentId: string,
    agentName: string,
    event: 'decision' | 'action' | 'error',
    data: unknown,
  ): void {
    // Create an AI event (will be persisted like any other event)
    const eventType: GameEventType = `ai:${event}`;

    const aiEvent: GameEvent = {
      id: `event-${nanoid(10)}`,
      type: eventType,
      timestamp: Date.now(),
      originRoomId: '', // AI events don't have a room origin
      visibility: 'private', // Never sent to game clients
      relatedEntities: [],
      data: {
        agentId,
        agentName,
        ...(typeof data === 'object' && data !== null ? data : { raw: data }),
      },
    };

    // Broadcast through event system (will be persisted and sent to admin)
    if (this.eventPropagator) {
      this.eventPropagator.broadcast(aiEvent);
    }

    // Also console log for real-time debugging
    console.info(`[AI ${agentName}] ${event}:`, JSON.stringify(data, null, 2));
  }
}

export const aiDebugLogger = new AIDebugLogger();
