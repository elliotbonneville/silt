/**
 * AI Debug Logger - tracks AI decisions as game events
 */

import type { GameEvent, GameEventType } from '@silt/shared';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import type { EventPropagator } from './event-propagator.js';

const AIActionDataSchema = z.object({
  action: z.string(),
  arguments: z.record(z.string(), z.unknown()).optional(),
  reasoning: z.string().optional(),
});

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

    // Generate human-readable content based on event type
    let content = '';
    if (event === 'action') {
      const parseResult = AIActionDataSchema.safeParse(data);
      if (parseResult.success) {
        const { action, arguments: args, reasoning } = parseResult.data;
        const argStr = args
          ? Object.entries(args)
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join(', ')
          : '';
        content = `${agentName} decided: ${action}${argStr ? ` (${argStr})` : ''}${reasoning ? ` - ${reasoning}` : ''}`;
      }
    } else if (event === 'decision') {
      content = `${agentName} is thinking...`;
    } else if (event === 'error') {
      content = `${agentName} encountered an error`;
    }

    const aiEvent: GameEvent = {
      id: `event-${nanoid(10)}`,
      type: eventType,
      timestamp: Date.now(),
      originRoomId: '', // AI events don't have a room origin
      visibility: 'private', // Never sent to game clients
      relatedEntities: [],
      content, // Human-readable summary
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
