/**
 * AI Agent Manager - handles AI agent lifecycle and event responses
 */

import type { AIAgent, Character } from '@prisma/client';
import type { GameEvent } from '@silt/shared';
import { nanoid } from 'nanoid';
import { findAllAIAgents, updateAIAgent } from '../database/index.js';
import type { AIAction, AIService } from './ai/index.js';
import { parseRelationships, serializeRelationships } from './ai/index.js';
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
   * Process proactive actions for all agents
   */
  private async processProactiveActions(): Promise<void> {
    for (const [characterId, agent] of this.agents.entries()) {
      const character = this.getCharacter(characterId);
      if (!character) continue;

      // Filter 1: Only agents in rooms with players
      const roomChars = this.getCharactersInRoom(character.currentRoomId);
      const hasPlayers = roomChars.some((c) => c.accountId !== null);
      if (!hasPlayers) continue;

      // Filter 2: Cooldown check
      if (!this.canRespond(agent.id)) continue;

      // Filter 3: Must have queued events to react to
      const queuedEvents = this.getQueuedEvents(characterId);
      if (queuedEvents.length === 0) continue;

      // Get context
      const formattedEvents = queuedEvents.map(formatEventForAI);
      const lastAction = this.lastResponseTime.get(agent.id) || 0;
      const timeSinceLastAction = Math.floor((Date.now() - lastAction) / 1000);
      const relationships = parseRelationships(agent.relationshipsJson);
      const roomContext = `${roomChars.length} people in room`;

      try {
        // Ask LLM what to do
        const action = await this.aiService.decideAction(
          agent.systemPrompt,
          character.name,
          formattedEvents,
          relationships,
          timeSinceLastAction,
          roomContext,
        );

        if (action) {
          await this.executeAIAction(agent, character, action);
          this.lastResponseTime.set(agent.id, Date.now());
        }
      } catch (error) {
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
   * Handle ANY event - AI sees everything and LLM decides if they should respond
   */
  async handleEvent(event: GameEvent, charactersInRoom: Character[]): Promise<GameEvent[]> {
    // Note: Events are now queued per-agent via queueEventForAgent() by EventPropagator
    // This method is called on specific events to check if AI should respond

    // Skip if no players (optimization - AI doesn't talk to itself)
    const hasPlayers = charactersInRoom.some((c) => c.accountId !== null);
    if (!hasPlayers) return [];

    const responseEvents: GameEvent[] = [];

    // Check each AI agent in the room
    for (const character of charactersInRoom) {
      const agent = this.agents.get(character.id);
      if (!agent) continue;
      if (!this.canRespond(agent.id)) continue; // Cooldown check

      // Get queued events for this specific agent (they've been receiving ALL room events)
      const queuedEvents = this.getQueuedEvents(agent.characterId);
      if (queuedEvents.length === 0) continue;

      const formattedEvents = queuedEvents.map(formatEventForAI);

      // Calculate time since last response
      const lastResponse = this.lastResponseTime.get(agent.id) || 0;
      const timeSinceLastResponse = Math.floor((Date.now() - lastResponse) / 1000);

      // Load memory
      const relationships = parseRelationships(agent.relationshipsJson);
      const roomContext = `${charactersInRoom.length} people present`;

      try {
        // LLM decides if should respond based on ALL recent events
        const decision = await this.aiService.decideResponse(
          agent.systemPrompt,
          character.name,
          formattedEvents,
          relationships,
          timeSinceLastResponse,
          roomContext,
        );

        if (!decision.shouldRespond || !decision.response) continue;

        // Update relationships
        const speakerName = event.data?.['actorName'];
        if (typeof speakerName === 'string') {
          const currentRel = relationships.get(speakerName) || {
            sentiment: 5,
            trust: 3,
            familiarity: 0,
            lastSeen: new Date().toISOString(),
            role: 'newcomer',
          };

          relationships.set(speakerName, {
            ...currentRel,
            familiarity: currentRel.familiarity + 1,
            lastSeen: new Date().toISOString(),
          });
        }

        // Save updated memory
        await updateAIAgent(agent.id, {
          relationshipsJson: serializeRelationships(relationships),
          lastActionAt: new Date(),
        });

        // Update cooldown
        this.lastResponseTime.set(agent.id, Date.now());

        // Create AI response event
        responseEvents.push({
          id: `event-${nanoid(10)}`,
          type: 'speech',
          timestamp: Date.now(),
          originRoomId: event.originRoomId,
          content: `${character.name} says: "${decision.response}"`,
          relatedEntities: [],
          visibility: 'room',
          data: {
            actorId: character.id,
            actorName: character.name,
            message: decision.response,
            isAI: true,
            reasoning: decision.reasoning,
          },
        });
      } catch (error) {
        console.error(`AI agent ${character.name} failed to process event:`, error);
      }
    }

    return responseEvents;
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
