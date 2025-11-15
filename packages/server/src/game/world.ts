/**
 * World state - manages rooms, actors, and game state
 * For Iteration 0, everything is in-memory (no database)
 */

import type { RoomId } from '@silt/shared';
import { createRoomId } from '@silt/shared';

export interface Room {
  readonly id: RoomId;
  readonly name: string;
  readonly description: string;
  readonly exits: ReadonlyMap<string, RoomId>;
}

export class World {
  private rooms = new Map<RoomId, Room>();
  private getPlayersInRoomFn?: (roomId: RoomId) => readonly { name: string }[];

  constructor() {
    this.initializeStarterWorld();
  }

  setPlayerLookupFunction(fn: (roomId: RoomId) => readonly { name: string }[]): void {
    this.getPlayersInRoomFn = fn;
  }

  private initializeStarterWorld(): void {
    const townId = createRoomId('town-square');
    const tavernId = createRoomId('tavern');
    const forestId = createRoomId('forest-path');

    const town: Room = {
      id: townId,
      name: 'Town Square',
      description: 'A bustling town square with a fountain in the center.',
      exits: new Map([
        ['north', forestId],
        ['east', tavernId],
      ]),
    };

    const tavern: Room = {
      id: tavernId,
      name: 'The Tavern',
      description: 'A cozy tavern with a warm fireplace.',
      exits: new Map([['west', townId]]),
    };

    const forest: Room = {
      id: forestId,
      name: 'Forest Path',
      description: 'A dark forest path leading north into the unknown.',
      exits: new Map([['south', townId]]),
    };

    this.rooms.set(townId, town);
    this.rooms.set(tavernId, tavern);
    this.rooms.set(forestId, forest);
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
   * Get formatted room description including occupants
   */
  getRoomDescription(roomId: RoomId, excludePlayerName?: string): string {
    const room = this.rooms.get(roomId);
    if (!room) {
      return 'Unknown location';
    }

    const exits = Array.from(room.exits.keys()).join(', ');

    // Get other players in room
    const players = this.getPlayersInRoomFn ? this.getPlayersInRoomFn(roomId) : [];
    const otherPlayers = players.filter((p) => p.name !== excludePlayerName).map((p) => p.name);

    let description = `${room.name}\n\n${room.description}\n\nExits: ${exits}`;

    if (otherPlayers.length > 0) {
      description += `\n\nAlso here: ${otherPlayers.join(', ')}`;
    }

    return description;
  }
}
