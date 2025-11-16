/**
 * AI service - manages OpenAI integration for AI agents
 */

import OpenAI from 'openai';

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

export class AIService {
  private client: OpenAI | null = null;
  private readonly maxTokens = 150;
  private readonly useMock: boolean;

  constructor(apiKey: string) {
    // Use mock mode if API key is the placeholder or 'mock'
    this.useMock = apiKey === 'mock' || apiKey === 'sk-your-api-key-here';

    if (!this.useMock) {
      this.client = new OpenAI({ apiKey });
    }
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

    // Mock mode for testing without OpenAI
    if (this.useMock) {
      return this.generateMockResponse(playerName, playerMessage, relationship);
    }

    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

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
   * Generate a mock response for testing without OpenAI
   */
  private generateMockResponse(
    playerName: string,
    playerMessage: string,
    relationship: RelationshipData,
  ): AIResponse {
    const greetings = ['hello', 'hi', 'hey', 'greetings'];
    const isGreeting = greetings.some((g) => playerMessage.toLowerCase().includes(g));

    let response: string;

    if (relationship.familiarity === 0) {
      response = `Welcome to the town square, ${playerName}! I'm here to help.`;
    } else if (isGreeting) {
      response = `Good to see you again, ${playerName}! How can I assist you today?`;
    } else if (playerMessage.toLowerCase().includes('help')) {
      response = 'Try exploring the exits, picking up items, or examining things around you!';
    } else {
      response = 'Interesting! Tell me more, or ask if you need any help.';
    }

    return {
      message: response,
      updatedRelationship: {
        familiarity: relationship.familiarity + 1,
        lastSeen: new Date().toISOString(),
      },
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
}
