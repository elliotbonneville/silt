/**
 * Room formatting utilities - generate room descriptions and data
 */

import type { Room as DBRoom } from '@prisma/client';
import { findCharactersInRoom } from '../database/character-repository.js';
import { findItemsInRoom, findRoomById, getRoomExits } from '../database/index.js';

export interface Room {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly exits: ReadonlyMap<string, string>;
}

/**
 * Transform database room to Room interface
 */
export function transformRoom(dbRoom: DBRoom): Room {
  const exits = getRoomExits(dbRoom);
  const exitsMap = new Map<string, string>();

  for (const [direction, roomId] of Object.entries(exits)) {
    // biome-ignore lint/style/noNonNullAssertion: roomId is always defined in Object.entries
    exitsMap.set(direction, roomId!);
  }

  return {
    id: dbRoom.id,
    name: dbRoom.name,
    description: dbRoom.description,
    exits: exitsMap,
  };
}

/**
 * Get room exit in a direction
 */
export async function getRoomExit(roomId: string, direction: string): Promise<string | undefined> {
  const dbRoom = await findRoomById(roomId);
  if (!dbRoom) return undefined;
  const room = transformRoom(dbRoom);
  return room.exits.get(direction.toLowerCase());
}

/**
 * Get structured room data including occupants and items
 */
export async function getRoomData(
  roomId: string,
  excludePlayerName?: string,
): Promise<{
  name: string;
  description: string;
  exits: { direction: string; roomName?: string }[];
  occupants: { id: string; name: string; isNpc: boolean }[];
  items: { id: string; name: string }[];
} | null> {
  const dbRoom = await findRoomById(roomId);
  if (!dbRoom) return null;

  const room = transformRoom(dbRoom);

  // Get exits with room names (query Prisma for each)
  const exitEntries = Array.from(room.exits.entries());
  const exits = await Promise.all(
    exitEntries.map(async ([direction, targetRoomId]) => {
      const targetDbRoom = await findRoomById(targetRoomId);
      return targetDbRoom ? { direction, roomName: targetDbRoom.name } : { direction };
    }),
  );

  // Get other players in room
  const characters = await findCharactersInRoom(roomId);
  const occupants = characters
    .filter((c) => c.name !== excludePlayerName)
    .map((c) => ({ id: c.id, name: c.name, isNpc: c.accountId === null }));

  // Get items in room (exclude spawn points - they're ambient, not interactive)
  const items = await findItemsInRoom(roomId);
  const regularItems = items
    .filter((item) => item.itemType !== 'spawn_point')
    .map((item) => ({ id: item.id, name: item.name }));

  return {
    name: room.name,
    description: room.description,
    exits,
    occupants,
    items: regularItems,
  };
}

/**
 * Get formatted room description including occupants and items
 */
export async function getRoomDescription(
  roomId: string,
  excludePlayerName?: string,
): Promise<string> {
  const roomData = await getRoomData(roomId, excludePlayerName);
  if (!roomData) {
    return 'Unknown location';
  }

  const exitsList = roomData.exits.map((e) => e.direction).join(', ');
  let description = `${roomData.name}\n\n${roomData.description}\n\nExits: ${exitsList}`;

  if (roomData.items.length > 0) {
    description += `\n\nYou see: ${roomData.items.map((i) => i.name).join(', ')}`;
  }

  if (roomData.occupants.length > 0) {
    description += `\n\nAlso here: ${roomData.occupants.map((o) => o.name).join(', ')}`;
  }

  return description;
}
