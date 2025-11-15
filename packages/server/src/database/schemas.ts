/**
 * Zod schemas for database validation
 * Uses auto-generated schemas from Prisma + custom JSON field schemas
 */

import { z } from 'zod';
import { CharacterSchema, ItemSchema, RoomSchema } from './generated/index.js';

// Re-export generated schemas for convenience
export { CharacterSchema, ItemSchema, RoomSchema };

/**
 * Schema for room exits JSON
 * Example: { "north": "room-id", "east": "room-id" }
 */
export const roomExitsSchema = z.record(z.string(), z.string());

export type RoomExitsData = z.infer<typeof roomExitsSchema>;

/**
 * Schema for item stats JSON
 * Example: { damage: 10, defense: 5, healing: 50 }
 */
export const itemStatsSchema = z.object({
  damage: z.number().int().min(0).optional(),
  defense: z.number().int().min(0).optional(),
  healing: z.number().int().min(0).optional(),
});

export type ItemStatsData = z.infer<typeof itemStatsSchema>;

/**
 * Enhanced Room schema with parsed exits
 */
export const RoomWithParsedExitsSchema = RoomSchema.transform((room) => ({
  ...room,
  exits: parseRoomExits(room.exitsJson),
}));

/**
 * Enhanced Item schema with parsed stats
 */
export const ItemWithParsedStatsSchema = ItemSchema.transform((item) => ({
  ...item,
  stats: parseItemStats(item.statsJson),
}));

/**
 * Parse room exits with validation
 */
export function parseRoomExits(exitsJson: string): RoomExitsData {
  try {
    const parsed: unknown = JSON.parse(exitsJson);
    return roomExitsSchema.parse(parsed);
  } catch (error) {
    console.error('Failed to parse room exits:', error);
    return {};
  }
}

/**
 * Parse item stats with validation
 */
export function parseItemStats(statsJson: string): ItemStatsData {
  try {
    const parsed: unknown = JSON.parse(statsJson);
    return itemStatsSchema.parse(parsed);
  } catch (error) {
    console.error('Failed to parse item stats:', error);
    return {};
  }
}
