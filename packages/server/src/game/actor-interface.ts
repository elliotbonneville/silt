/**
 * Actor implementations - unified interface for event delivery
 */

import type { GameEvent } from '@silt/shared';
import type { Server } from 'socket.io';
import type { AIAgentManager } from './ai-agent-manager.js';

/**
 * Player actor - sends events via WebSocket
 */
export class PlayerActor {
  readonly actorType = 'player' as const;

  constructor(
    readonly id: string,
    private readonly socketId: string,
    private readonly io: Server,
  ) {}

  handleEvent(event: GameEvent): void {
    this.io.to(this.socketId).emit('game:event', event);
  }
}

/**
 * AI Agent actor - queues events for LLM processing
 */
export class AIAgentActor {
  readonly actorType = 'ai_agent' as const;

  constructor(
    readonly id: string,
    private readonly aiAgentManager: AIAgentManager,
  ) {}

  handleEvent(event: GameEvent): void {
    // Queue event for this AI agent
    this.aiAgentManager.queueEventForAgent(this.id, event);
  }
}
