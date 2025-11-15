/**
 * Zod schemas for database JSON fields
 * Provides type-safe parsing without `as` casts
 */

import { z } from 'zod';

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
  damage: z.number().optional(),
  defense: z.number().optional(),
  healing: z.number().optional(),
});

export type ItemStatsData = z.infer<typeof itemStatsSchema>;

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
