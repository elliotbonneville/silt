/**
 * World state - manages rooms, actors, and game state
 * Iteration 1: Loads from database
 */

import type { RoomId } from '@silt/shared';
import { createRoomId } from '@silt/shared';
import { findAllRooms, findItemsInRoom, getRoomExits } from '../database/index.js';

export interface Room {
  readonly id: RoomId;
  readonly name: string;
  readonly description: string;
  readonly exits: ReadonlyMap<string, RoomId>;
}

export class World {
  private rooms = new Map<RoomId, Room>();
  private getPlayersInRoomFn?: (roomId: RoomId) => readonly { name: string }[];
  private initialized = false;

  /**
   * Load world data from database
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const dbRooms = await findAllRooms();

    for (const dbRoom of dbRooms) {
      const exits = getRoomExits(dbRoom);
      const exitsMap = new Map<string, RoomId>();

      for (const [direction, roomId] of Object.entries(exits)) {
        // biome-ignore lint/style/noNonNullAssertion: roomId is always defined in Object.entries
        exitsMap.set(direction, createRoomId(roomId!));
      }

      const room: Room = {
        id: createRoomId(dbRoom.id),
        name: dbRoom.name,
        description: dbRoom.description,
        exits: exitsMap,
      };
      this.rooms.set(room.id, room);
    }

    this.initialized = true;
  }

  setPlayerLookupFunction(fn: (roomId: RoomId) => readonly { name: string }[]): void {
    this.getPlayersInRoomFn = fn;
  }

  /**
   * Check if world is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  getRoom(roomId: RoomId): Room | undefined {
    return this.rooms.get(roomId);
  }

  getAllRooms(): readonly Room[] {
    return Array.from(this.rooms.values());
  }

  getStartingRoomId(): RoomId {
    return createRoomId('town-square');
  }

  getRoomExit(roomId: RoomId, direction: string): RoomId | undefined {
    const room = this.rooms.get(roomId);
    return room?.exits.get(direction.toLowerCase());
  }

  /**
   * Get formatted room description including occupants and items
   */
  async getRoomDescription(roomId: RoomId, excludePlayerName?: string): Promise<string> {
    const room = this.rooms.get(roomId);
    if (!room) {
      return 'Unknown location';
    }

    const exits = Array.from(room.exits.keys()).join(', ');

    // Get other players in room
    const players = this.getPlayersInRoomFn ? this.getPlayersInRoomFn(roomId) : [];
    const otherPlayers = players.filter((p) => p.name !== excludePlayerName).map((p) => p.name);

    // Get items in room
    const items = await findItemsInRoom(roomId);
    const itemNames = items.map((item) => item.name);

    let description = `${room.name}\n\n${room.description}\n\nExits: ${exits}`;

    if (itemNames.length > 0) {
      description += `\n\nYou see: ${itemNames.join(', ')}`;
    }

    if (otherPlayers.length > 0) {
      description += `\n\nAlso here: ${otherPlayers.join(', ')}`;
    }

    return description;
  }
}
