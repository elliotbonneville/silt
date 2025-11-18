/**
 * Context builder - creates rich context for AI decision making
 */

import type { AIAgent, Character } from '@prisma/client';
import { findCharactersInRoom, findItemsInRoom, findRoomById } from '../../database/index.js';

export interface RoomContextData {
  currentRoomId: string;
  currentRoomName: string;
  homeRoomId: string;
  homeRoomName: string;
  maxRoomsFromHome: number;
  charactersPresent: Array<{
    name: string;
    isAlive: boolean;
    hp: number;
    maxHp: number;
    isPlayer: boolean;
  }>;
  itemsPresent: Array<{
    name: string;
    itemType: string;
  }>;
  adjacentRooms: Array<{
    direction: string;
    roomId: string;
    roomName: string;
  }>;
}

/**
 * Build rich room context for AI decision making
 */
export async function buildRoomContext(
  agent: AIAgent,
  character: Character,
): Promise<RoomContextData> {
  // Get current room details
  const currentRoom = await findRoomById(character.currentRoomId);
  const homeRoom = await findRoomById(agent.homeRoomId);

  // Get characters in room
  const roomChars = await findCharactersInRoom(character.currentRoomId);
  const charactersPresent = roomChars
    .filter((c) => c.id !== character.id) // Exclude self
    .map((c) => ({
      name: c.name,
      isAlive: c.isAlive,
      hp: c.hp,
      maxHp: c.maxHp,
      isPlayer: c.accountId !== null,
    }));

  // Get items in room
  const roomItems = await findItemsInRoom(character.currentRoomId);
  const itemsPresent = roomItems.map((item) => ({
    name: item.name,
    itemType: item.itemType,
  }));

  // Parse exits and get adjacent room info
  const exitsJson = currentRoom?.exitsJson || '{}';
  const exits: Record<string, string> = JSON.parse(exitsJson);
  const adjacentRooms = await Promise.all(
    Object.entries(exits).map(async ([direction, roomId]) => {
      const room = await findRoomById(roomId);
      return {
        direction,
        roomId,
        roomName: room?.name || 'Unknown',
      };
    }),
  );

  return {
    currentRoomId: character.currentRoomId,
    currentRoomName: currentRoom?.name || 'Unknown',
    homeRoomId: agent.homeRoomId,
    homeRoomName: homeRoom?.name || 'Unknown',
    maxRoomsFromHome: agent.maxRoomsFromHome,
    charactersPresent,
    itemsPresent,
    adjacentRooms,
  };
}

/**
 * Format room context as a human-readable string for prompts
 */
export function formatRoomContextForPrompt(context: RoomContextData): string {
  const location = `You are in: ${context.currentRoomName} (${context.currentRoomId})
Your home: ${context.homeRoomName} (stay within ${context.maxRoomsFromHome} room${context.maxRoomsFromHome === 1 ? '' : 's'})`;

  const people =
    context.charactersPresent.length > 0
      ? `\nPeople present:\n${context.charactersPresent
          .map((c) => {
            const status = c.isAlive ? `${c.hp}/${c.maxHp} HP` : 'DEAD';
            const type = c.isPlayer ? 'player' : 'NPC';
            return `  - ${c.name} (${type}, ${status})`;
          })
          .join('\n')}`
      : '\nNo other people present';

  const items =
    context.itemsPresent.length > 0
      ? `\nItems present:\n${context.itemsPresent
          .map((i) => `  - ${i.name} (${i.itemType})`)
          .join('\n')}`
      : '\nNo items present';

  const exits =
    context.adjacentRooms.length > 0
      ? `\nAdjacent rooms:\n${context.adjacentRooms
          .map((r) => `  - ${r.direction}: ${r.roomName}`)
          .join('\n')}`
      : '\nNo exits available';

  return `${location}${people}${items}${exits}`;
}
