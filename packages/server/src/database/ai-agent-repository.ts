/**
 * AI Agent repository - database operations for AI agents
 */

import type { AIAgent } from '@prisma/client';
import { prisma } from './client.js';

export interface CreateAIAgentInput {
  readonly characterId: string;
  readonly systemPrompt: string;
  readonly homeRoomId: string;
  readonly maxRoomsFromHome?: number;
}

/**
 * Create a new AI agent
 */
export async function createAIAgent(input: CreateAIAgentInput): Promise<AIAgent> {
  return await prisma.aIAgent.create({
    data: {
      characterId: input.characterId,
      systemPrompt: input.systemPrompt,
      homeRoomId: input.homeRoomId,
      maxRoomsFromHome: input.maxRoomsFromHome ?? 2,
    },
  });
}

/**
 * Find AI agent by character ID
 */
export async function findAIAgentByCharacterId(characterId: string): Promise<AIAgent | null> {
  return await prisma.aIAgent.findUnique({
    where: { characterId },
  });
}

/**
 * Find all AI agents
 */
export async function findAllAIAgents(): Promise<AIAgent[]> {
  return await prisma.aIAgent.findMany();
}

/**
 * Update AI agent
 */
export async function updateAIAgent(
  id: string,
  data: {
    readonly relationshipsJson?: string;
    readonly conversationJson?: string;
    readonly lastActionAt?: Date;
    readonly systemPrompt?: string;
    readonly spatialMemory?: string;
    readonly spatialMemoryUpdatedAt?: Date;
  },
): Promise<AIAgent> {
  return await prisma.aIAgent.update({
    where: { id },
    data,
  });
}
