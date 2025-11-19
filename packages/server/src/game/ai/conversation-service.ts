/**
 * Conversation service - handles conversational AI responses
 */

import type OpenAI from 'openai';
import { trackTokenUsage } from '../../database/token-usage-repository.js';
import { createNewRelationship } from './memory-utils.js';
import type { AIAgentMemory, AIResponse } from './types.js';

/**
 * Generate a conversational response from an AI agent
 */
export async function generateResponse(
  client: OpenAI,
  agentId: string,
  agentPersonality: string,
  playerName: string,
  playerMessage: string,
  memory: AIAgentMemory,
  roomContext: string,
): Promise<AIResponse> {
  const relationship = memory.relationships.get(playerName) || createNewRelationship();

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

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 150,
    temperature: 0.8,
  });

  if (response.usage) {
    await trackTokenUsage({
      model: response.model,
      provider: client.baseURL,
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
      source: 'conversation',
      agentId,
    });
  }

  const aiMessage = response.choices[0]?.message?.content || 'I have nothing to say.';

  return {
    message: aiMessage,
    updatedRelationship: {
      familiarity: relationship.familiarity + 1,
      lastSeen: new Date().toISOString(),
    },
  };
}
