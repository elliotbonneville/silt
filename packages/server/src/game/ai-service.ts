/**
 * AI service - manages OpenAI integration for AI agents
 */

import OpenAI from 'openai';
import { z } from 'zod';

interface RelationshipData {
  sentiment: number; // -10 to +10
  trust: number; // 0 to 10
  familiarity: number; // Number of interactions
  lastSeen: string;
  role: string; // AI-assigned archetype
}

interface ConversationMessage {
  speaker: string;
  message: string;
  timestamp: number;
}

export interface AIAgentMemory {
  relationships: Map<string, RelationshipData>;
  conversationHistory: ConversationMessage[];
}

export interface AIResponse {
  message: string;
  updatedRelationship?: Partial<RelationshipData>;
}

/**
 * Zod schema for AI decision responses
 */
const AIDecisionSchema = z.object({
  shouldRespond: z.boolean(),
  response: z.string().nullable(),
  reasoning: z.string().optional(),
});

export type AIDecision = z.infer<typeof AIDecisionSchema>;

export class AIService {
  private client: OpenAI;
  private readonly maxTokens = 150;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Generate a response from an AI agent
   */
  async generateResponse(
    agentPersonality: string,
    playerName: string,
    playerMessage: string,
    memory: AIAgentMemory,
    roomContext: string,
  ): Promise<AIResponse> {
    const relationship = memory.relationships.get(playerName) || this.createNewRelationship();

    const recentHistory = memory.conversationHistory.slice(-10);

    const systemPrompt = `${agentPersonality}

You are a character in a text-based RPG. Keep responses brief (1-2 sentences max).
Focus on being helpful and staying in character.

Current relationship with ${playerName}:
- Sentiment: ${relationship.sentiment}/10
- Trust: ${relationship.trust}/10
- Times met: ${relationship.familiarity}
- Role: ${relationship.role}

Room context: ${roomContext}`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add recent conversation history
    for (const msg of recentHistory) {
      messages.push({
        role: msg.speaker === playerName ? 'user' : 'assistant',
        content: msg.message,
      });
    }

    // Add current message
    messages.push({ role: 'user', content: playerMessage });

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: this.maxTokens,
      temperature: 0.8,
    });

    const aiMessage = response.choices[0]?.message?.content || 'I have nothing to say.';

    // Update relationship (simple increment for now)
    const updatedRelationship: Partial<RelationshipData> = {
      familiarity: relationship.familiarity + 1,
      lastSeen: new Date().toISOString(),
    };

    return {
      message: aiMessage,
      updatedRelationship,
    };
  }

  /**
   * Create a new relationship for a first-time interaction
   */
  private createNewRelationship(): RelationshipData {
    return {
      sentiment: 5, // Neutral
      trust: 3, // Low trust initially
      familiarity: 0,
      lastSeen: new Date().toISOString(),
      role: 'newcomer',
    };
  }

  /**
   * Parse relationships JSON to Map
   */
  static parseRelationships(json: string): Map<string, RelationshipData> {
    try {
      const obj = JSON.parse(json);
      return new Map(Object.entries(obj));
    } catch {
      return new Map();
    }
  }

  /**
   * Serialize relationships Map to JSON
   */
  static serializeRelationships(relationships: Map<string, RelationshipData>): string {
    const obj = Object.fromEntries(relationships);
    return JSON.stringify(obj);
  }

  /**
   * Parse conversation history JSON
   */
  static parseConversation(json: string): ConversationMessage[] {
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  }

  /**
   * Serialize conversation history to JSON
   */
  static serializeConversation(messages: ConversationMessage[]): string {
    return JSON.stringify(messages);
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
    // Build relationships context
    const relContext = Array.from(relationships.entries())
      .map(([name, rel]) => `- ${name}: familiarity ${rel.familiarity}, trust ${rel.trust}/10`)
      .join('\n');

    const prompt = `You are ${agentName}. ${agentPersonality}

Recent events you witnessed:
${recentEvents.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Relationships with people present:
${relContext || 'No prior relationships'}

Last spoke: ${timeSinceLastResponse} seconds ago
Room: ${roomContext}

Rules for speaking:
- Speak when directly addressed by name
- Greet newcomers
- React to dramatic events (deaths, victories)
- Don't interrupt private conversations
- Wait at least 3 seconds between comments
- Keep responses to 1-2 sentences max

Should you say something? Respond with JSON only:
{
  "shouldRespond": true or false,
  "response": "your message" or null,
  "reasoning": "why you decided this"
}`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 200,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { shouldRespond: false, response: null };
    }

    try {
      const parsed: unknown = JSON.parse(content);
      const result = AIDecisionSchema.safeParse(parsed);

      if (!result.success) {
        console.error('Failed to parse AI decision:', result.error);
        return { shouldRespond: false, response: null };
      }

      return result.data;
    } catch (error) {
      console.error('Failed to parse AI response JSON:', error);
      return { shouldRespond: false, response: null };
    }
  }
}
