/**
 * AI system types and schemas
 */

import { z } from 'zod';

export interface RelationshipData {
  sentiment: number; // -10 to +10
  trust: number; // 0 to 10
  familiarity: number; // Number of interactions
  lastSeen: string;
  role: string; // AI-assigned archetype
}

export interface ConversationMessage {
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
export const AIDecisionSchema = z.object({
  shouldRespond: z.boolean(),
  response: z.string().nullable(),
  reasoning: z.string().optional(),
});

export type AIDecision = z.infer<typeof AIDecisionSchema>;

/**
 * Zod schema for AI action decisions
 */
export const AIActionSchema = z.object({
  action: z.string(),
  arguments: z.record(z.string(), z.unknown()),
  reasoning: z.string().optional(),
});

export type AIAction = z.infer<typeof AIActionSchema>;
