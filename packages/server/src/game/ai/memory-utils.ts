/**
 * Memory utilities - parsing and serialization
 */

import type { ConversationMessage, RelationshipData } from './types.js';

/**
 * Parse relationships JSON to Map
 */
export function parseRelationships(json: string): Map<string, RelationshipData> {
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
export function serializeRelationships(relationships: Map<string, RelationshipData>): string {
  const obj = Object.fromEntries(relationships);
  return JSON.stringify(obj);
}

/**
 * Parse conversation history JSON
 */
export function parseConversation(json: string): ConversationMessage[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

/**
 * Serialize conversation history to JSON
 */
export function serializeConversation(messages: ConversationMessage[]): string {
  return JSON.stringify(messages);
}

/**
 * Create a new relationship for a first-time interaction
 */
export function createNewRelationship(): RelationshipData {
  return {
    sentiment: 5, // Neutral
    trust: 3, // Low trust initially
    familiarity: 0,
    lastSeen: new Date().toISOString(),
    role: 'newcomer',
  };
}
