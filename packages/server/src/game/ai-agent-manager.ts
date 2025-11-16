/**
 * AI Agent Manager - handles AI agent lifecycle and event responses
 */

import type { AIAgent, Character } from '@prisma/client';
import type { GameEvent } from '@silt/shared';
import { findAllAIAgents, findCharactersInRoom, updateAIAgent } from '../database/index.js';
import type { AIAction, AIService } from './ai/index.js';
import { parseRelationships } from './ai/index.js';
import { aiDebugLogger } from './ai-debug-logger.js';

const MIN_RESPONSE_COOLDOWN_MS = 3000; // Minimum 3 seconds between responses
const EVENT_CONTEXT_WINDOW_MS = 30000; // Consider events from last 30 seconds

export class AIAgentManager {
  private agentEventQueues = new Map<string, GameEvent[]>(); // agentId → event queue (30s buffer)
  private proactiveLoopTimer: NodeJS.Timeout | undefined = undefined;

  constructor(
    private readonly aiService: AIService,
    private readonly getCharacter: (id: string) => Promise<Character | null>,
    private readonly executeAIAction: (
      agent: AIAgent,
      character: Character,
      action: AIAction,
    ) => Promise<void>,
  ) {}

  /**
   * Load all AI agents from database (for initialization)
   */
  async loadAgents(): Promise<AIAgent[]> {
    return await findAllAIAgents();
  }

  /**
   * Start proactive behavior loop
   */
  startProactiveLoop(): void {
    if (this.proactiveLoopTimer) return; // Already running

    // Check all agents every 10 seconds
    this.proactiveLoopTimer = setInterval(() => {
      this.processProactiveActions().catch((error) => {
        console.error('Error in proactive AI loop:', error);
      });
    }, 10000);

    console.info('🤖 AI proactive behavior loop started');
  }

  /**
   * Stop proactive behavior loop
   */
  stopProactiveLoop(): void {
    if (this.proactiveLoopTimer !== undefined) {
      clearInterval(this.proactiveLoopTimer);
    }
    this.proactiveLoopTimer = undefined;
  }

  /**
   * Process all agents - UNIFIED decision loop
   */
  private async processProactiveActions(): Promise<void> {
    // Query all agents from DB (always fresh)
    const agents = await findAllAIAgents();

    for (const agent of agents) {
      const character = await this.getCharacter(agent.characterId);
      if (!character || !character.isAlive) continue;

      // Filter: Only agents in rooms with players
      const roomChars = await findCharactersInRoom(character.currentRoomId);
      const hasPlayers = roomChars.some((c) => c.accountId !== null);
      if (!hasPlayers) continue;

      // Filter: Cooldown check (query DB for latest lastActionAt)
      const now = Date.now();
      const lastActionTime = agent.lastActionAt.getTime();
      const timeSinceLastAction = now - lastActionTime;
      if (timeSinceLastAction < MIN_RESPONSE_COOLDOWN_MS) continue;

      // Filter: Must have queued events
      const queuedEvents = this.getQueuedEvents(agent.characterId);
      if (queuedEvents.length === 0) continue;

      // Process queued events (already formatted by EventPropagator with agent's perspective)
      const formattedEvents = queuedEvents.map((e) => e.content || 'Something happened.');
      const timeSinceLastActionSec = Math.floor(timeSinceLastAction / 1000);
      const relationships = parseRelationships(agent.relationshipsJson);
      const roomContext = `${roomChars.length} people in room`;

      try {
        // Log decision attempt
        aiDebugLogger.log(agent.id, character.name, 'decision', {
          queuedEvents: formattedEvents,
          timeSinceLastAction: timeSinceLastActionSec,
          roomContext,
        });

        // LLM decides action
        const action = await this.aiService.decideAction(
          agent.systemPrompt,
          character.name,
          formattedEvents,
          relationships,
          timeSinceLastActionSec,
          roomContext,
        );

        if (action) {
          aiDebugLogger.log(agent.id, character.name, 'action', {
            action: action.action,
            arguments: action.arguments,
            reasoning: action.reasoning,
          });

          await this.executeAIAction(agent, character, action);

          // Update lastActionAt in database
          await updateAIAgent(agent.id, { lastActionAt: new Date() });
        } else {
          aiDebugLogger.log(agent.id, character.name, 'decision', {
            result: 'No action chosen',
            queuedEventsCount: formattedEvents.length,
          });
        }
      } catch (error) {
        aiDebugLogger.log(agent.id, character.name, 'error', { error: String(error) });
        console.error(`AI agent ${character.name} failed to decide action:`, error);
      }
    }
  }

  /**
   * Queue an event for an AI agent (called by EventPropagator)
   * AI agents receive ALL events just like players do
   */
  queueEventForAgent(agentId: string, event: GameEvent): void {
    // Skip room descriptions - AI doesn't need these
    if (event.type === 'room_description') return;

    // Skip events from this agent itself
    if (event.data?.['actorId'] === agentId) return;

    const queue = this.agentEventQueues.get(agentId) || [];
    queue.push(event);

    // Keep only last 30 seconds of events
    const cutoff = Date.now() - EVENT_CONTEXT_WINDOW_MS;
    this.agentEventQueues.set(
      agentId,
      queue.filter((e: GameEvent) => e.timestamp > cutoff),
    );
  }

  /**
   * Get queued events for an agent
   */
  private getQueuedEvents(agentId: string): GameEvent[] {
    const queue = this.agentEventQueues.get(agentId) || [];
    const cutoff = Date.now() - EVENT_CONTEXT_WINDOW_MS;
    return queue.filter((e: GameEvent) => e.timestamp > cutoff);
  }

  /**
   * Execute an AI action (for proactive behavior)
   * Returns command string that can be executed
   */
  buildCommandFromAction(action: AIAction): string {
    const args = action.arguments;
    const argValues = Object.values(args).filter((v) => typeof v === 'string');
    return `${action.action} ${argValues.join(' ')}`.trim();
  }
}
