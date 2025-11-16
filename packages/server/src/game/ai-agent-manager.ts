/**
 * AI Agent Manager - handles AI agent lifecycle and event responses
 */

import type { AIAgent, Character } from '@prisma/client';
import type { GameEvent } from '@silt/shared';
import { findAllAIAgents } from '../database/index.js';
import type { AIAction, AIService } from './ai/index.js';
import { parseRelationships } from './ai/index.js';
import { aiDebugLogger } from './ai-debug-logger.js';
import { formatEventForAI } from './event-formatter.js';

const MIN_RESPONSE_COOLDOWN_MS = 3000; // Minimum 3 seconds between responses
const EVENT_CONTEXT_WINDOW_MS = 30000; // Consider events from last 30 seconds

export class AIAgentManager {
  private agents = new Map<string, AIAgent>(); // characterId → AIAgent
  private lastResponseTime = new Map<string, number>(); // agentId → timestamp
  private agentEventQueues = new Map<string, GameEvent[]>(); // agentId → event queue
  private proactiveLoopTimer: NodeJS.Timeout | undefined = undefined;

  constructor(
    private readonly aiService: AIService,
    private readonly getCharacter: (id: string) => Character | undefined,
    private readonly getCharactersInRoom: (roomId: string) => Character[],
    private readonly executeAIAction: (
      agent: AIAgent,
      character: Character,
      action: AIAction,
    ) => Promise<void>,
  ) {}

  /**
   * Load all AI agents from database
   */
  async loadAgents(): Promise<AIAgent[]> {
    const agents = await findAllAIAgents();
    for (const agent of agents) {
      this.agents.set(agent.characterId, agent);
    }
    return agents;
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
    for (const [characterId, agent] of this.agents.entries()) {
      const character = this.getCharacter(characterId);
      if (!character || !character.isAlive) continue;

      // Filter: Only agents in rooms with players
      const roomChars = this.getCharactersInRoom(character.currentRoomId);
      const hasPlayers = roomChars.some((c) => c.accountId !== null);
      if (!hasPlayers) continue;

      // Filter: Cooldown check
      if (!this.canRespond(agent.id)) continue;

      // Filter: Must have queued events
      const queuedEvents = this.getQueuedEvents(characterId);
      if (queuedEvents.length === 0) continue;

      // Process queued events
      const formattedEvents = queuedEvents.map(formatEventForAI);
      const lastAction = this.lastResponseTime.get(agent.id) || 0;
      const timeSinceLastAction = Math.floor((Date.now() - lastAction) / 1000);
      const relationships = parseRelationships(agent.relationshipsJson);
      const roomContext = `${roomChars.length} people in room`;

      try {
        // Log decision attempt
        aiDebugLogger.log(agent.id, character.name, 'decision', {
          queuedEvents: formattedEvents,
          timeSinceLastAction,
          roomContext,
        });

        // LLM decides action
        const action = await this.aiService.decideAction(
          agent.systemPrompt,
          character.name,
          formattedEvents,
          relationships,
          timeSinceLastAction,
          roomContext,
        );

        if (action) {
          aiDebugLogger.log(agent.id, character.name, 'action', {
            action: action.action,
            arguments: action.arguments,
            reasoning: action.reasoning,
          });

          await this.executeAIAction(agent, character, action);
          this.lastResponseTime.set(agent.id, Date.now());
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
   * Check if agent can respond (cooldown check)
   */
  private canRespond(agentId: string): boolean {
    const lastResponse = this.lastResponseTime.get(agentId) || 0;
    const now = Date.now();
    return now - lastResponse >= MIN_RESPONSE_COOLDOWN_MS;
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
