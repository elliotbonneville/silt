/**
 * AI Agent Manager - handles AI agent lifecycle and event responses
 */

import type { AIAgent, Character } from '@prisma/client';
import type { GameEvent } from '@silt/shared';
import { updateAIAgent } from '../database/index.js';
import { loadAgentsWithQueues, saveEventQueues } from './ai/agent-persistence.js';
import { buildRoomContext, formatRoomContextForPrompt } from './ai/context-builder.js';
import type { AIAction, AIService } from './ai/index.js';
import { parseRelationships } from './ai/index.js';
import { initializeSpatialMemory } from './ai/spatial-memory-system.js';
import { AIAttentionProcessor } from './ai-attention-processor.js';
import { aiDebugLogger, generateEventId } from './ai-debug-logger.js';
import type { GameSystem, TickContext } from './systems/game-loop.js';

const EVENT_CONTEXT_WINDOW_MS = 90000; // Keep events for 90 seconds (historical context)

export class AIAgentManager implements GameSystem {
  private agentEventQueues = new Map<string, GameEvent[]>();
  private agentOutputQueues = new Map<string, Array<{ timestamp: number; text: string }>>();
  private attentionProcessor = new AIAttentionProcessor();
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

  async loadAgents(): Promise<AIAgent[]> {
    const { agents, queues } = await loadAgentsWithQueues();
    this.agentEventQueues = queues;
    return agents;
  }

  async saveEventQueuesToDatabase(): Promise<void> {
    await saveEventQueues(this.agentEventQueues);
  }

  async initializeSpatialMemory(): Promise<void> {
    return initializeSpatialMemory(this.aiService);
  }

  onTick(context: TickContext): void {
    if (!this.isRunning) return;

    this.saveTimer += context.deltaTime;

    // Process attention queue (every tick)
    this.attentionProcessor
      .processAttentionQueue((agent) => this.decideAgentAction(agent))
      .catch((error) => {
        console.error('Error in AI attention loop:', error);
      });

    // Save event queues every 30 seconds
    if (this.saveTimer >= 30) {
      this.saveTimer = 0;
      this.saveEventQueuesToDatabase().catch((error) => {
        console.error('Error saving event queues:', error);
      });
    }
  }

  startProactiveLoop(): void {
    this.isRunning = true;
    console.info('🤖 AI proactive behavior loop enabled');
  }

  pauseProactiveLoop(): void {
    this.isRunning = false;
  }

  resumeProactiveLoop(): void {
    this.startProactiveLoop();
  }

  stopProactiveLoop(): void {
    this.isRunning = false;
  }

  private async decideAgentAction(agent: AIAgent): Promise<void> {
    const character = await this.getCharacter(agent.characterId);
    if (!character || !character.isAlive) return;

    const decisionEventId = generateEventId();
    const state = this.attentionProcessor.getAgentState(agent.characterId);
    const inCombat = state.inCombat;

    const allEvents = this.getAllEvents(agent.characterId);
    const allOutputs = this.getAllOutputs(agent.characterId);

    if (allEvents.length === 0 && allOutputs.length === 0) return;

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

    const eventLog = combined;
    const timeSinceLastActionSec = Math.floor((Date.now() - agent.lastActionAt.getTime()) / 1000);
    const relationships = parseRelationships(agent.relationshipsJson);

    const contextData = await buildRoomContext(agent, character);
    const roomContext = formatRoomContextForPrompt(contextData);
    const combatContext = inCombat ? '\n[COMBAT ACTIVE] You are in combat! Attack your enemy!' : '';

    try {
      const decisionResult = await this.aiService.decideAction(
        agent.id,
        agent.systemPrompt,
        character.name,
        eventLog,
        relationships,
        timeSinceLastActionSec,
        roomContext + combatContext,
        agent.spatialMemory || undefined,
        decisionEventId,
      );

      const action = decisionResult.action;

      aiDebugLogger.log(
        agent.id,
        character.name,
        'decision',
        {
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
        },
        decisionEventId,
      );

      if (action) {
        aiDebugLogger.log(agent.id, character.name, 'action', {
          action: action.action,
          arguments: action.arguments,
          reasoning: action.reasoning,
        });

        await this.executeAIAction(agent, character, action);
        await updateAIAgent(agent.id, { lastActionAt: new Date() });
      }
    } catch (error) {
      aiDebugLogger.log(
        agent.id,
        character.name,
        'error',
        { error: String(error) },
        decisionEventId,
      );
      console.error(`AI agent ${character.name} failed to decide action:`, error);
    }
  }

  queueEventForAgent(agentId: string, event: GameEvent): void {
    const queue = this.agentEventQueues.get(agentId) || [];
    queue.push(event);

    const cutoff = Date.now() - EVENT_CONTEXT_WINDOW_MS;
    this.agentEventQueues.set(
      agentId,
      queue.filter((e: GameEvent) => e.timestamp > cutoff),
    );

    const reactionDelay = this.calculateReactionDelay(event, agentId);
    if (reactionDelay !== null) {
      const state = this.attentionProcessor.getAgentState(agentId);
      const scheduledTime = Date.now() + reactionDelay;

      if (event.type === 'combat_start' || event.type === 'combat_hit') {
        state.inCombat = true;
        state.lastCombatEventAt = Date.now();
      }

      if (scheduledTime < state.nextProcessingTime) {
        state.nextProcessingTime = scheduledTime;
      }
    }
  }

  private calculateReactionDelay(event: GameEvent, _agentId: string): number | null {
    if (event.type === 'combat_start' || event.type === 'combat_hit') {
      return 500 + Math.random() * 1000;
    }

    if (event.type === 'death') {
      return 500 + Math.random() * 500;
    }

    if (event.type === 'speech') {
      if (this.isDirectedAtAgent(event, _agentId)) {
        return 1000 + Math.random() * 1500;
      }
      return 3000 + Math.random() * 2000;
    }

    if (event.type === 'movement') {
      return 3000 + Math.random() * 2000;
    }

    if (event.type === 'shout') {
      return 5000 + Math.random() * 5000;
    }

    return null;
  }

  private isDirectedAtAgent(_event: GameEvent, _agentId: string): boolean {
    return false;
  }

  queueOutputForAgent(agentId: string, output: import('@silt/shared').CommandOutput): void {
    const queue = this.agentOutputQueues.get(agentId) || [];

    if (output.text) {
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

      const cutoff = Date.now() - EVENT_CONTEXT_WINDOW_MS;
      this.agentOutputQueues.set(
        agentId,
        queue.filter((o) => o.timestamp > cutoff),
      );
    }
  }

  private getAllOutputs(agentId: string): Array<{ timestamp: number; text: string }> {
    const queue = this.agentOutputQueues.get(agentId) || [];
    const cutoff = Date.now() - EVENT_CONTEXT_WINDOW_MS;
    return queue.filter((o) => o.timestamp > cutoff);
  }

  private getAllEvents(agentId: string): GameEvent[] {
    const queue = this.agentEventQueues.get(agentId) || [];
    const cutoff = Date.now() - EVENT_CONTEXT_WINDOW_MS;
    return queue.filter((e: GameEvent) => e.timestamp > cutoff);
  }

  buildCommandFromAction(action: AIAction): string {
    const args = action.arguments;
    const argValues = Object.values(args).filter((v) => typeof v === 'string');
    return `${action.action} ${argValues.join(' ')}`.trim();
  }
}
