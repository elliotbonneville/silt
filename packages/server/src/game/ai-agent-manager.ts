/**
 * AI Agent Manager - handles AI agent lifecycle and event responses
 */

import type { AIAgent, Character } from '@prisma/client';
import type { GameEvent } from '@silt/shared';
import { findAllAIAgents, findCharacterById, updateAIAgent } from '../database/index.js';
import { buildRoomContext, formatRoomContextForPrompt } from './ai/context-builder.js';
import type { AIAction, AIService } from './ai/index.js';
import { parseRelationships, refreshAgentSpatialMemory } from './ai/index.js';
import { aiDebugLogger } from './ai-debug-logger.js';

const MIN_RESPONSE_COOLDOWN_MS = 3000; // Minimum 3 seconds between responses
const EVENT_CONTEXT_WINDOW_MS = 90000; // Keep events for 90 seconds (historical context)

export class AIAgentManager {
  private agentEventQueues = new Map<string, GameEvent[]>(); // agentId → event queue
  private agentOutputQueues = new Map<string, Array<{ timestamp: number; text: string }>>(); // agentId → output queue
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
    const agents = await findAllAIAgents();

    // Restore event queues from database
    for (const agent of agents) {
      try {
        // Check if new field exists (will after migration)
        const agentRecord: Record<string, unknown> = agent;
        const eventQueueJson = agentRecord['eventQueueJson'];

        if (typeof eventQueueJson === 'string') {
          const storedEvents: unknown = JSON.parse(eventQueueJson);
          if (Array.isArray(storedEvents)) {
            // Filter to events with required fields, TypeScript will accept this
            const validEvents = storedEvents.filter(
              (e): e is GameEvent =>
                e !== null &&
                typeof e === 'object' &&
                'id' in e &&
                'type' in e &&
                'timestamp' in e &&
                'originRoomId' in e &&
                'visibility' in e,
            );
            this.agentEventQueues.set(agent.characterId, validEvents);
          }
        }
      } catch (error) {
        console.error(`Failed to restore event queue for agent ${agent.id}:`, error);
      }
    }

    return agents;
  }

  /**
   * Save event queues to database (called periodically or on shutdown)
   */
  async saveEventQueuesToDatabase(): Promise<void> {
    for (const [characterId, queue] of this.agentEventQueues.entries()) {
      try {
        const agents = await findAllAIAgents();
        const agent = agents.find((a) => a.characterId === characterId);
        if (agent) {
          const updates: Record<string, unknown> = {
            eventQueueJson: JSON.stringify(queue),
          };
          await updateAIAgent(agent.id, updates);
        }
      } catch (error) {
        console.error(`Failed to save event queue for character ${characterId}:`, error);
      }
    }
  }

  /**
   * Initialize spatial memory for all agents (runs in background)
   * Should be called on server startup (non-blocking)
   */
  async initializeSpatialMemory(): Promise<void> {
    console.info('🗺️  Initializing spatial memory for AI agents (background task)...');
    const agents = await findAllAIAgents();

    for (const agent of agents) {
      const character = await findCharacterById(agent.characterId);
      if (!character) {
        console.warn(`⚠️  Character not found for agent ${agent.id}`);
        continue;
      }

      try {
        // Check if spatial memory needs refresh (older than 24 hours)
        const hoursSinceUpdate =
          (Date.now() - agent.spatialMemoryUpdatedAt.getTime()) / (1000 * 60 * 60);

        if (!agent.spatialMemory || hoursSinceUpdate > 24) {
          console.info(`   🔄 ${character.name}: Generating spatial memory...`);
          const spatialMemory = await refreshAgentSpatialMemory(
            this.aiService,
            agent,
            character.name,
          );

          await updateAIAgent(agent.id, {
            spatialMemory,
            spatialMemoryUpdatedAt: new Date(),
          });

          console.info(`   ✓ ${character.name}: Spatial memory ready`);
        } else {
          console.info(`   ✓ ${character.name}: Spatial memory up to date (cached)`);
        }
      } catch (error) {
        console.error(`   ✗ ${character.name}: Failed to initialize spatial memory:`, error);
        console.error(`      Agent will function without spatial memory (cannot give directions)`);
      }
    }

    console.info('✅ Spatial memory initialization complete\n');
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

    // Save event queues every 30 seconds
    setInterval(() => {
      this.saveEventQueuesToDatabase().catch((error) => {
        console.error('Error saving event queues:', error);
      });
    }, 30000);

    console.info('🤖 AI proactive behavior loop started');
  }

  /**
   * Pause proactive behavior loop
   */
  pauseProactiveLoop(): void {
    if (this.proactiveLoopTimer) {
      clearInterval(this.proactiveLoopTimer);
      this.proactiveLoopTimer = undefined;
    }
  }

  /**
   * Resume proactive behavior loop
   */
  resumeProactiveLoop(): void {
    this.startProactiveLoop();
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
