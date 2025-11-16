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
   * Handle a speech event - AI agents in the room may respond
   */
  async handleSpeechEvent(event: GameEvent, charactersInRoom: Character[]): Promise<GameEvent[]> {
    if (event.type !== 'speech') return [];

    const speakerId = event.data?.['actorId'];
    if (typeof speakerId !== 'string') return [];

    const speaker = charactersInRoom.find((c) => c.id === speakerId);
    if (!speaker) return [];

    const responseEvents: GameEvent[] = [];

    // Check each AI agent in the room
    for (const character of charactersInRoom) {
      const agent = this.agents.get(character.id);
      if (!agent || character.id === speakerId) continue; // Skip non-AI and self
      if (!this.shouldRespond(agent.id)) continue;

      // Generate AI response
      const message = event.data?.['message'];
      if (typeof message !== 'string') continue;

      const memory = {
        relationships: AIService.parseRelationships(agent.relationshipsJson),
        conversationHistory: AIService.parseConversation(agent.conversationJson),
      };

      const roomContext = `In the ${event.originRoomId}`;

      try {
        const aiResponse = await this.aiService.generateResponse(
          agent.systemPrompt,
          speaker.name,
          message,
          memory,
          roomContext,
        );

        // Update memory
        if (aiResponse.updatedRelationship) {
          const currentRel = memory.relationships.get(speaker.name) || {
            sentiment: 5,
            trust: 3,
            familiarity: 0,
            lastSeen: new Date().toISOString(),
            role: 'newcomer',
          };

          memory.relationships.set(speaker.name, {
            ...currentRel,
            ...aiResponse.updatedRelationship,
          });
        }

        // Add to conversation history
        memory.conversationHistory.push({
          speaker: speaker.name,
          message,
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
            targetId: speaker.id,
            targetName: speaker.name,
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
}
