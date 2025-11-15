/**
 * API schemas for request/response validation
 * Built on top of generated Prisma Zod schemas
 */

import { z } from 'zod';

/**
 * Create character request body
 */
export const CreateCharacterRequestSchema = z.object({
  name: z.string().min(1).max(50).trim(),
});

export type CreateCharacterRequest = z.infer<typeof CreateCharacterRequestSchema>;

/**
 * Character list item for API responses
 */
export const CharacterListItemResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  isAlive: z.boolean(),
  hp: z.number().int(),
  maxHp: z.number().int(),
  createdAt: z.string(),
  diedAt: z.string().optional(),
});

export type CharacterListItemResponse = z.infer<typeof CharacterListItemResponseSchema>;

/**
 * Character response for API
 */
export const CharacterResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  isAlive: z.boolean(),
  hp: z.number().int(),
  maxHp: z.number().int(),
  currentRoomId: z.string().optional(),
  attackPower: z.number().int().optional(),
  defense: z.number().int().optional(),
  createdAt: z.string().optional(),
});

export type CharacterResponse = z.infer<typeof CharacterResponseSchema>;
