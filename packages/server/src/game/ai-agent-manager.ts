/**
 * AI Agent Manager - handles AI agent lifecycle and event responses
 */

import type { AIAgent, Character } from '@prisma/client';
import type { GameEvent } from '@silt/shared';
import { nanoid } from 'nanoid';
import { findAllAIAgents, updateAIAgent } from '../database/index.js';
import { AIService } from './ai-service.js';

const CONVERSATION_COOLDOWN_MS = 3000; // 3 seconds between AI responses

export class AIAgentManager {
  private agents = new Map<string, AIAgent>(); // characterId → AIAgent
  private lastResponseTime = new Map<string, number>(); // agentId → timestamp
  private lastGreetedPlayer = new Map<string, number>(); // agentId-playerId → timestamp

  constructor(private readonly aiService: AIService) {}

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
   * Check if an agent should respond to a speech event
   */
  private shouldRespond(agentId: string): boolean {
    const lastResponse = this.lastResponseTime.get(agentId) || 0;
    const now = Date.now();
    return now - lastResponse >= CONVERSATION_COOLDOWN_MS;
  }

  /**
   * Check if AI agent should react to an interaction
   */
  private shouldReactTo(
    content: string,
    agentName: string,
    totalInRoom: number,
    eventType: string,
  ): boolean {
    const lowerContent = content.toLowerCase();
    const lowerName = agentName.toLowerCase();

    // Explicit targeting: content mentions agent's name
    if (lowerContent.includes(lowerName)) return true;

    // Implicit targeting: only 2 in room (player + AI)
    if (totalInRoom === 2) return true;

    // For speech: check for directed greetings/questions
    if (eventType === 'speech') {
      const greetings = ['hello', 'hi', 'hey', 'greetings', 'howdy'];
      const questions = ['what', 'where', 'when', 'who', 'how', 'why', '?'];

      const isGreeting = greetings.some((g) => lowerContent.startsWith(g));
      const isQuestion = questions.some((q) => lowerContent.includes(q));

      // Respond to greetings/questions when only the AI and player
      if ((isGreeting || isQuestion) && totalInRoom === 2) return true;
    }

    // For emotes: only respond if explicitly named or alone
    // Don't respond to every emote (would be spammy)
    if (eventType === 'emote') {
      // Already checked name and room count above
      return false;
    }

    // Not addressed
    return false;
  }

  /**
   * Handle interaction events (speech or emote) - AI agents in the room may respond
   */
  async handleInteractionEvent(
    event: GameEvent,
    charactersInRoom: Character[],
  ): Promise<GameEvent[]> {
    if (event.type !== 'speech' && event.type !== 'emote') return [];

    const actorId = event.data?.['actorId'];
    if (typeof actorId !== 'string') return [];

    const actor = charactersInRoom.find((c) => c.id === actorId);
    if (!actor) return [];

    const responseEvents: GameEvent[] = [];

    // Check each AI agent in the room
    for (const character of charactersInRoom) {
      const agent = this.agents.get(character.id);
      if (!agent || character.id === actorId) continue; // Skip non-AI and self
      if (!this.shouldRespond(agent.id)) continue;

      // Get the interaction content (message for speech, action for emote)
      const interactionContent =
        event.type === 'speech'
          ? event.data?.['message']
          : event.type === 'emote'
            ? event.data?.['action']
            : undefined;

      if (typeof interactionContent !== 'string') continue;

      // Check if AI should react to this interaction
      if (
        !this.shouldReactTo(interactionContent, character.name, charactersInRoom.length, event.type)
      ) {
        continue;
      }

      const memory = {
        relationships: AIService.parseRelationships(agent.relationshipsJson),
        conversationHistory: AIService.parseConversation(agent.conversationJson),
      };

      const roomContext = `In the ${event.originRoomId}`;
      const interactionType = event.type === 'speech' ? 'said' : 'did';
      const contextMessage =
        event.type === 'speech'
          ? `${actor.name} ${interactionType}: "${interactionContent}"`
          : `${actor.name} ${interactionContent}`;

      try {
        const aiResponse = await this.aiService.generateResponse(
          agent.systemPrompt,
          actor.name,
          contextMessage,
          memory,
          roomContext,
        );

        // Update memory
        if (aiResponse.updatedRelationship) {
          const currentRel = memory.relationships.get(actor.name) || {
            sentiment: 5,
            trust: 3,
            familiarity: 0,
            lastSeen: new Date().toISOString(),
            role: 'newcomer',
          };

          memory.relationships.set(actor.name, {
            ...currentRel,
            ...aiResponse.updatedRelationship,
          });
        }

        // Add to conversation history
        memory.conversationHistory.push({
          speaker: actor.name,
          message: contextMessage,
          timestamp: Date.now(),
        });

        memory.conversationHistory.push({
          speaker: character.name,
          message: aiResponse.message,
          timestamp: Date.now(),
        });

        // Keep only last 20 messages
        if (memory.conversationHistory.length > 20) {
          memory.conversationHistory = memory.conversationHistory.slice(-20);
        }

        // Save updated memory
        await updateAIAgent(agent.id, {
          relationshipsJson: AIService.serializeRelationships(memory.relationships),
          conversationJson: AIService.serializeConversation(memory.conversationHistory),
          lastActionAt: new Date(),
        });

        // Update cooldown
        this.lastResponseTime.set(agent.id, Date.now());

        // Create response event
        responseEvents.push({
          id: `event-${nanoid(10)}`,
          type: 'speech',
          timestamp: Date.now(),
          originRoomId: event.originRoomId,
          content: `${character.name} says: "${aiResponse.message}"`,
          relatedEntities: [],
          visibility: 'room',
          data: {
            actorId: character.id,
            actorName: character.name,
            targetId: actor.id,
            targetName: actor.name,
            message: aiResponse.message,
            isAI: true,
          },
        });
      } catch (error) {
        console.error(`AI agent ${character.name} failed to respond:`, error);
      }
    }

    return responseEvents;
  }

  /**
   * Handle player entered event - AI may greet them
   */
  async handlePlayerEntered(event: GameEvent, charactersInRoom: Character[]): Promise<GameEvent[]> {
    if (event.type !== 'player_entered') return [];

    const playerId = event.data?.['actorId'];
    const playerName = event.data?.['actorName'];
    if (typeof playerId !== 'string' || typeof playerName !== 'string') return [];

    const greetingEvents: GameEvent[] = [];
    const now = Date.now();

    // Check each AI agent in the room
    for (const character of charactersInRoom) {
      const agent = this.agents.get(character.id);
      if (!agent) continue;

      // Check if we recently greeted this player (don't spam greetings)
      const greetKey = `${agent.id}-${playerId}`;
      const lastGreeted = this.lastGreetedPlayer.get(greetKey) || 0;
      if (now - lastGreeted < 300000) continue; // 5 minutes between greetings

      // Get relationship to personalize greeting
      const memory = {
        relationships: AIService.parseRelationships(agent.relationshipsJson),
        conversationHistory: AIService.parseConversation(agent.conversationJson),
      };

      const relationship = memory.relationships.get(playerName);
      const isReturning = relationship && relationship.familiarity > 0;

      const greeting = isReturning
        ? `Welcome back, ${playerName}! Good to see you again.`
        : `Welcome to the square, ${playerName}!`;

      // Update last greeted time
      this.lastGreetedPlayer.set(greetKey, now);

      // Create greeting event
      greetingEvents.push({
        id: `event-${nanoid(10)}`,
        type: 'speech',
        timestamp: now,
        originRoomId: event.originRoomId,
        content: `${character.name} says: "${greeting}"`,
        relatedEntities: [],
        visibility: 'room',
        data: {
          actorId: character.id,
          actorName: character.name,
          targetId: playerId,
          targetName: playerName,
          message: greeting,
          isAI: true,
          isGreeting: true,
        },
      });
    }

    return greetingEvents;
  }
}
