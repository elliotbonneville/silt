/**
 * World state - manages rooms, actors, and game state
 * Iteration 1: Loads from database
 */

import { findAllRooms, findItemsInRoom, getRoomExits } from '../database/index.js';

export interface Room {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly exits: ReadonlyMap<string, string>;
}

export class World {
  private rooms = new Map<string, Room>();
  private getPlayersInRoomFn?: (roomId: string) => readonly { name: string }[];
  private initialized = false;

  /**
   * Load world data from database
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const dbRooms = await findAllRooms();

    for (const dbRoom of dbRooms) {
      const exits = getRoomExits(dbRoom);
      const exitsMap = new Map<string, string>();

      for (const [direction, roomId] of Object.entries(exits)) {
        // biome-ignore lint/style/noNonNullAssertion: roomId is always defined in Object.entries
        exitsMap.set(direction, roomId!);
      }

      const room: Room = {
        id: dbRoom.id,
        name: dbRoom.name,
        description: dbRoom.description,
        exits: exitsMap,
      };
      this.rooms.set(room.id, room);
    }

    this.initialized = true;
  }

  setPlayerLookupFunction(fn: (roomId: string) => readonly { name: string }[]): void {
    this.getPlayersInRoomFn = fn;
  }

  /**
   * Check if world is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getAllRooms(): readonly Room[] {
    return Array.from(this.rooms.values());
  }

  getStartingRoomId(): string {
    return 'town-square';
  }

  /**
   * Get the default spawn point ID (Town Fountain)
   */
  async getDefaultSpawnPointId(): Promise<string> {
    const { prisma } = await import('../database/client.js');

    const spawnPoint = await prisma.item.findFirst({
      where: {
        itemType: 'spawn_point',
        roomId: this.getStartingRoomId(),
      },
    });

    if (!spawnPoint) {
      throw new Error('No spawn point found in starting room');
    }

    return spawnPoint.id;
  }

  getRoomExit(roomId: string, direction: string): string | undefined {
    const room = this.rooms.get(roomId);
    return room?.exits.get(direction.toLowerCase());
  }

  /**
   * Get structured room data including occupants and items
   */
  async getRoomData(
    roomId: string,
    excludePlayerName?: string,
  ): Promise<{
    name: string;
    description: string;
    exits: { direction: string; roomName?: string }[];
    occupants: { id: string; name: string; isNpc: boolean }[];
    items: { id: string; name: string }[];
  } | null> {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    // Get exits with room names
    const exits = Array.from(room.exits.entries()).map(([direction, targetRoomId]) => {
      const roomName = this.rooms.get(targetRoomId)?.name;
      return roomName ? { direction, roomName } : { direction };
    });

    // Get other players in room
    const players = this.getPlayersInRoomFn ? this.getPlayersInRoomFn(roomId) : [];
    const occupants = players
      .filter((p) => p.name !== excludePlayerName)
      .map((p) => ({ id: '', name: p.name, isNpc: false })); // TODO: Add character IDs

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
  async getRoomDescription(roomId: string, excludePlayerName?: string): Promise<string> {
    const roomData = await this.getRoomData(roomId, excludePlayerName);
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
}
