/**
 * Connection Handler - manages player connections and disconnections
 */

import type { Character } from '@prisma/client';
import { nanoid } from 'nanoid';
import type { Server } from 'socket.io';
import { PlayerActor } from './actor-interface.js';
import type { ActorRegistry } from './actor-registry.js';
import type { CharacterManager } from './character-manager.js';
import type { EventPropagator } from './event-propagator.js';
import type { World } from './world.js';

export class ConnectionHandler {
  constructor(
    private readonly io: Server,
    private readonly characterManager: CharacterManager,
    private readonly actorRegistry: ActorRegistry,
    private readonly eventPropagator: EventPropagator,
    private readonly world: World,
  ) {}

  /**
   * Connect a player to a character
   */
  async connectPlayer(socketId: string, characterId: string): Promise<Character> {
    const character = await this.characterManager.connectPlayer(socketId, characterId);

    // Create player actor instance
    const playerActor = new PlayerActor(character.id, socketId, this.io);
    this.actorRegistry.addPlayer(characterId, character.currentRoomId, socketId, playerActor);

    // Broadcast player entered event
    this.eventPropagator.broadcast({
      id: `event-${nanoid()}`,
      type: 'player_entered',
      timestamp: Date.now(),
      originRoomId: character.currentRoomId,
      content: `${character.name} has entered the room.`,
      relatedEntities: [],
      visibility: 'room',
    });

    // Send initial room description (private event, send directly)
    const roomDescription = await this.world.getRoomDescription(
      character.currentRoomId,
      character.name,
    );
    this.io.to(socketId).emit('game:event', {
      id: `event-${nanoid()}`,
      type: 'room_description',
      timestamp: Date.now(),
      originRoomId: character.currentRoomId,
      content: roomDescription,
      relatedEntities: [],
      visibility: 'private',
    });

    return character;
  }

  /**
   * Disconnect a player
   */
  async disconnectPlayer(socketId: string): Promise<void> {
    const character = await this.characterManager.disconnectPlayer(socketId);
    if (!character) return;

    this.eventPropagator.broadcast({
      id: `event-${nanoid()}`,
      type: 'player_left',
      timestamp: Date.now(),
      originRoomId: character.currentRoomId,
      content: `${character.name} has left the room.`,
      relatedEntities: [],
      visibility: 'room',
    });

    this.actorRegistry.removeBySocketId(socketId);
  }
}
