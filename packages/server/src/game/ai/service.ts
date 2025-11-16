/**
 * AI Service - main interface for AI operations
 */

import OpenAI from 'openai';
import { generateResponse } from './conversation-service.js';
import { decideAction, decideResponse } from './decision-service.js';
import type { AIAction, AIAgentMemory, AIDecision, AIResponse, RelationshipData } from './types.js';

export class AIService {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Generate a conversational response
   */
  async generateResponse(
    agentPersonality: string,
    playerName: string,
    playerMessage: string,
    memory: AIAgentMemory,
    roomContext: string,
  ): Promise<AIResponse> {
    return generateResponse(
      this.client,
      agentPersonality,
      playerName,
      playerMessage,
      memory,
      roomContext,
    );
  }

  /**
   * Decide what action AI should take
   */
  async decideAction(
    agentPersonality: string,
    agentName: string,
    recentEvents: string[],
    relationships: Map<string, RelationshipData>,
    timeSinceLastAction: number,
    roomContext: string,
  ): Promise<AIAction | null> {
    return decideAction(
      this.client,
      agentPersonality,
      agentName,
      recentEvents,
      relationships,
      timeSinceLastAction,
      roomContext,
    );
  }

  /**
   * Decide if AI should respond to recent events
   */
  async decideResponse(
    agentPersonality: string,
    agentName: string,
    recentEvents: string[],
    relationships: Map<string, RelationshipData>,
    timeSinceLastResponse: number,
    roomContext: string,
  ): Promise<AIDecision> {
    return decideResponse(
      this.client,
      agentPersonality,
      agentName,
      recentEvents,
      relationships,
      timeSinceLastResponse,
      roomContext,
    );
  }
}
