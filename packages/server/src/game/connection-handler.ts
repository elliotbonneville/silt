/**
 * Connection Handler - manages player connections and disconnections
 */

import type { Character } from '@prisma/client';
import type { Server } from 'socket.io';
import type { CharacterManager } from './character-manager.js';
import { createEvent } from './create-game-event.js';
import type { EventPropagator } from './event-propagator.js';
import { getRoomData, getRoomDescription } from './room-formatter.js';

export class ConnectionHandler {
  constructor(
    private readonly io: Server,
    private readonly characterManager: CharacterManager,
    private readonly eventPropagator: EventPropagator,
  ) {}

  /**
   * Connect a player to a character
   */
  async connectPlayer(socketId: string, characterId: string): Promise<Character> {
    const character = await this.characterManager.connectPlayer(socketId, characterId);

    // Broadcast player entered event
    await this.eventPropagator.broadcast(
      createEvent('player_entered', character.currentRoomId, 'room', {
        actorId: character.id,
        actorName: character.name,
      }),
    );

    // Send initial room description as structured output
    const roomData = await getRoomData(character.currentRoomId, character.name);
    if (roomData) {
      const text = await getRoomDescription(character.currentRoomId, character.name);
      this.io.to(socketId).emit('game:output', {
        type: 'room',
        data: roomData,
        text,
      });
    }

    return character;
  }

  /**
   * Disconnect a player
   */
  async disconnectPlayer(socketId: string): Promise<void> {
    const character = await this.characterManager.disconnectPlayer(socketId);
    if (!character) return;

    await this.eventPropagator.broadcast(
      createEvent('player_left', character.currentRoomId, 'room', {
        actorId: character.id,
        actorName: character.name,
      }),
    );
  }
}
