/**
 * AI Agent Manager - handles AI agent lifecycle and event responses
 */

import type { AIAgent, Character } from '@prisma/client';
import type { GameEvent } from '@silt/shared';
import { findAllAIAgents, updateAIAgent } from '../database/index.js';
import { loadAgentsWithQueues, saveEventQueues } from './ai/agent-persistence.js';
import { buildRoomContext, formatRoomContextForPrompt } from './ai/context-builder.js';
import type { AIAction, AIService } from './ai/index.js';
import { parseRelationships } from './ai/index.js';
import { initializeSpatialMemory } from './ai/spatial-memory-system.js';
import { aiDebugLogger } from './ai-debug-logger.js';
import type { GameSystem, TickContext } from './systems/game-loop.js';

const MIN_RESPONSE_COOLDOWN_MS = 3000; // Minimum 3 seconds between responses
const EVENT_CONTEXT_WINDOW_MS = 90000; // Keep events for 90 seconds (historical context)

export class AIAgentManager implements GameSystem {
  private agentEventQueues = new Map<string, GameEvent[]>(); // agentId → event queue
  private agentOutputQueues = new Map<string, Array<{ timestamp: number; text: string }>>(); // agentId → output queue

  // Timer accumulators for loop-based scheduling
  private proactiveTimer = 0;
  private saveTimer = 0;
  private isRunning = false;

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
    const { agents, queues } = await loadAgentsWithQueues();
    this.agentEventQueues = queues;
    return agents;
  }

  /**
   * Save event queues to database (called periodically or on shutdown)
   */
  async saveEventQueuesToDatabase(): Promise<void> {
    await saveEventQueues(this.agentEventQueues);
  }

  /**
   * Initialize spatial memory for all agents (runs in background)
   * Should be called on server startup (non-blocking)
   */
  async initializeSpatialMemory(): Promise<void> {
    return initializeSpatialMemory(this.aiService);
  }

  /**
   * Game System Tick
   * Replaces the old interval-based loop
   */
  onTick(context: TickContext): void {
    if (!this.isRunning) return;

    this.proactiveTimer += context.deltaTime;
    this.saveTimer += context.deltaTime;

    // Run AI logic every 10 seconds
    if (this.proactiveTimer >= 10) {
      this.proactiveTimer = 0;
      this.processProactiveActions().catch((error) => {
        console.error('Error in proactive AI loop:', error);
      });
    }

    // Save event queues every 30 seconds
    if (this.saveTimer >= 30) {
      this.saveTimer = 0;
      this.saveEventQueuesToDatabase().catch((error) => {
        console.error('Error saving event queues:', error);
      });
    }
  }

  /**
   * Enable proactive behavior
   */
  startProactiveLoop(): void {
    this.isRunning = true;
    console.info('🤖 AI proactive behavior loop enabled');
  }

  /**
   * Disable proactive behavior
   */
  pauseProactiveLoop(): void {
    this.isRunning = false;
  }

  /**
   * Resume proactive behavior
   */
  resumeProactiveLoop(): void {
    this.startProactiveLoop();
  }

  /**
   * Stop proactive behavior
   */
  stopProactiveLoop(): void {
    this.isRunning = false;
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

      // Filter: Cooldown check (query DB for latest lastActionAt)
      const now = Date.now();
      const lastActionTime = agent.lastActionAt.getTime();
      const timeSinceLastAction = now - lastActionTime;
      if (timeSinceLastAction < MIN_RESPONSE_COOLDOWN_MS) continue;

      // Get all events and outputs from last 90 seconds
      const allEvents = this.getAllEvents(agent.characterId);
      const allOutputs = this.getAllOutputs(agent.characterId);

      if (allEvents.length === 0 && allOutputs.length === 0) continue;

      // Combine and sort by timestamp
      const combined = [
        ...allEvents.map((e) => ({
          timestamp: e.timestamp,
          content: e.content || 'Something happened.',
          type: 'event' as const,
        })),
        ...allOutputs.map((o) => ({
          timestamp: o.timestamp,
          content: o.text,
          type: 'output' as const,
        })),
      ].sort((a, b) => a.timestamp - b.timestamp);

      // Keep combined log with timestamps for LLM
      const eventLog = combined;
      const timeSinceLastActionSec = Math.floor(timeSinceLastAction / 1000);
      const relationships = parseRelationships(agent.relationshipsJson);

      // Build rich room context
      const contextData = await buildRoomContext(agent, character);
      const roomContext = formatRoomContextForPrompt(contextData);

      try {
        // LLM decides action (returns action + debug info)
        const decisionResult = await this.aiService.decideAction(
          agent.systemPrompt,
          character.name,
          eventLog,
          relationships,
          timeSinceLastActionSec,
          roomContext,
          agent.spatialMemory || undefined,
        );

        const action = decisionResult.action;

        // Log decision with full LLM context (including whether action was chosen)
        aiDebugLogger.log(agent.id, character.name, 'decision', {
          eventCount: eventLog.length,
          eventLog: eventLog.slice(-5).map((e) => e.content),
          timeSinceLastAction: timeSinceLastActionSec,
          currentRoom: contextData.currentRoomName,
          charactersPresent: contextData.charactersPresent.map((c) => ({
            name: c.name,
            isPlayer: c.isPlayer,
            hp: `${c.hp}/${c.maxHp}`,
          })),
          adjacentRooms: contextData.adjacentRooms.map((r) => `${r.direction}: ${r.roomName}`),
          promptSent: decisionResult.prompt,
          llmResponse: decisionResult.response,
          actionChosen: action ? action.action : 'none',
        });

        if (action) {
          aiDebugLogger.log(agent.id, character.name, 'action', {
            action: action.action,
            arguments: action.arguments,
            reasoning: action.reasoning,
          });

          await this.executeAIAction(agent, character, action);

          // Update lastActionAt in database
          await updateAIAgent(agent.id, { lastActionAt: new Date() });
        }
      } catch (error) {
        aiDebugLogger.log(agent.id, character.name, 'error', { error: String(error) });
        console.error(`AI agent ${character.name} failed to decide action:`, error);
      }
    }
  }

  /**
   * Queue an event for an AI agent (called by EventPropagator)
   * AI agents receive ALL events including their own actions (for context)
   */
  queueEventForAgent(agentId: string, event: GameEvent): void {
    const queue = this.agentEventQueues.get(agentId) || [];
    queue.push(event);

    // Keep only last 90 seconds of events
    const cutoff = Date.now() - EVENT_CONTEXT_WINDOW_MS;
    this.agentEventQueues.set(
      agentId,
      queue.filter((e: GameEvent) => e.timestamp > cutoff),
    );
  }

  /**
   * Queue command output for an AI agent (room descriptions, inventory, etc.)
   */
  queueOutputForAgent(agentId: string, output: import('@silt/shared').CommandOutput): void {
    const queue = this.agentOutputQueues.get(agentId) || [];

    // Store output with timestamp and context
    if (output.text) {
      // Add temporal context to room descriptions
      const contextualText =
        output.type === 'room'
          ? `[YOU MOVED HERE] ${output.text
              .split('\n')
              .map((line) => (line.startsWith('Also here:') ? `[PAST] ${line}` : line))
              .join('\n')}`
          : output.text;

      queue.push({
        timestamp: Date.now(),
        text: contextualText,
      });

      // Keep only last 90 seconds
      const cutoff = Date.now() - EVENT_CONTEXT_WINDOW_MS;
      this.agentOutputQueues.set(
        agentId,
        queue.filter((o) => o.timestamp > cutoff),
      );
    }
  }

  /**
   * Get all outputs for an agent (last 90 seconds)
   */
  private getAllOutputs(agentId: string): Array<{ timestamp: number; text: string }> {
    const queue = this.agentOutputQueues.get(agentId) || [];
    const cutoff = Date.now() - EVENT_CONTEXT_WINDOW_MS;
    return queue.filter((o) => o.timestamp > cutoff);
  }

  /**
   * Get all events for context (last 90 seconds, including agent's own actions)
   */
  private getAllEvents(agentId: string): GameEvent[] {
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
