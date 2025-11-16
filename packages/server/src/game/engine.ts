/**
 * Game engine - integrates all game systems
 * Manages world state, actors, and event propagation
 */

import type { Character } from '@prisma/client';
import type { CharacterListItem, GameEvent, RoomState } from '@silt/shared';
import { nanoid } from 'nanoid';
import type { Server } from 'socket.io';
import { ActorRegistry } from './actor-registry.js';
import { CharacterManager } from './character-manager.js';
import { type CommandContext, parseAndExecuteCommand } from './commands.js';
import { EventPropagator } from './event-propagator.js';
import { RoomGraph } from './room-graph.js';
import { World } from './world.js';

export class GameEngine {
  private readonly world: World;
  readonly characterManager: CharacterManager;
  private readonly actorRegistry: ActorRegistry;
  private roomGraph!: RoomGraph;
  private eventPropagator!: EventPropagator;
  private initialized = false;

  constructor(private readonly io: Server) {
    this.world = new World();
    this.characterManager = new CharacterManager(this.world);
    this.actorRegistry = new ActorRegistry();
  }

  /**
   * Initialize the game engine - load world from database
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load world from database
    await this.world.initialize();

    // Set up player lookup for room descriptions
    this.world.setPlayerLookupFunction((roomId) => {
      const actorIds = this.actorRegistry.getActorsInRoom(roomId);
      return Array.from(actorIds)
        .map((id) => this.characterManager.getCharacter(id))
        .filter((char) => char !== null && char !== undefined)
        .map((char) => ({ name: char.name }));
    });

    // Build room graph for distance calculations
    const rooms = this.world.getAllRooms();
    this.roomGraph = new RoomGraph(rooms);

    // Event propagator uses room graph and actor registry
    this.eventPropagator = new EventPropagator(this.roomGraph, this.actorRegistry);

    this.initialized = true;
  }

  /**
   * Get characters for a username
   */
  async getCharactersForUsername(username: string): Promise<CharacterListItem[]> {
    return await this.characterManager.getCharactersForUsername(username);
  }

  /**
   * Create a new character for a username
   */
  async createNewCharacter(username: string, name: string): Promise<Character> {
    if (!this.initialized) {
      throw new Error('Game engine not initialized');
    }
    return await this.characterManager.createNewCharacter(username, name);
  }

  /**
   * Connect a player to a character
   */
  async connectPlayerToCharacter(socketId: string, characterId: string): Promise<Character> {
    if (!this.initialized) {
      throw new Error('Game engine not initialized');
    }

    const character = await this.characterManager.connectPlayer(socketId, characterId);
    this.actorRegistry.addPlayer(characterId, character.currentRoomId, socketId);

    // Broadcast player entered event
    this.broadcastEvent({
      id: `event-${nanoid()}`,
      type: 'player_entered',
      timestamp: Date.now(),
      originRoomId: character.currentRoomId,
      content: `${character.name} has entered the room.`,
      relatedEntities: [],
      visibility: 'room',
    });

    // Send initial room description
    const roomDescription = await this.world.getRoomDescription(
      character.currentRoomId,
      character.name,
    );

    this.broadcastEvent(
      {
        id: `event-${nanoid()}`,
        type: 'room_description',
        timestamp: Date.now(),
        originRoomId: character.currentRoomId,
        content: roomDescription,
        relatedEntities: [],
        visibility: 'private',
      },
      socketId,
    );

    return character;
  }

  /**
   * Disconnect a player
   */
  async disconnectPlayer(socketId: string): Promise<void> {
    const character = await this.characterManager.disconnectPlayer(socketId);
    if (!character) return;

    // Broadcast player left event
    this.broadcastEvent({
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

  /**
   * Handle a command from a player
   */
  async handleCommand(socketId: string, commandText: string): Promise<void> {
    const character = this.characterManager.getCharacterBySocketId(socketId);
    if (!character) {
      throw new Error('Character not found');
    }

    const context: CommandContext = {
      character,
      world: this.world,
      getCharacterInRoom: (roomId: string, name: string) =>
        this.characterManager.getCharacterInRoom(roomId, name),
    };

    const result = await parseAndExecuteCommand(commandText, context);

    if (!result.success && result.error) {
      // Send error only to the player who issued the command
      this.io.to(socketId).emit('game:error', { message: result.error });
      return;
    }

    // Handle movement commands (update character location)
    if (result.success && result.events.length > 0) {
      const moveEvent = result.events.find((e) => e.type === 'movement');
      if (moveEvent?.data && this.isMovementData(moveEvent.data)) {
        // Update character location in memory
        character.currentRoomId = moveEvent.data.toRoomId;
        this.actorRegistry.moveActor(
          character.id,
          moveEvent.data.fromRoomId,
          moveEvent.data.toRoomId,
        );
      }
    }

    // Broadcast all events
    for (const event of result.events) {
      this.broadcastEvent(event, socketId);
    }

    // Send character stat updates after events that modify stats
    const combatEvent = result.events.find((e) => e.type === 'combat_hit');
    const hasEquipment = result.events.some((e) => e.type === 'item_equip' || e.type === 'system');

    // Update attacker stats
    if (combatEvent || hasEquipment) {
      this.characterManager.sendCharacterUpdate(character.id);
    }

    // Update victim stats if combat occurred
    if (combatEvent?.data) {
      const targetId = combatEvent.data['targetId'];
      if (typeof targetId === 'string') {
        this.characterManager.sendCharacterUpdate(targetId);
      }
    }

    // Handle death events - disconnect dead characters
    const deathEvent = result.events.find((e) => e.type === 'death');
    if (deathEvent?.data) {
      const victimId = deathEvent.data['victimId'];
      if (typeof victimId === 'string') {
        await this.characterManager.handleCharacterDeath(victimId);
      }
    }
  }

  /**
   * Type guard for movement event data
   */
  private isMovementData(
    data: Record<string, unknown>,
  ): data is { fromRoomId: string; toRoomId: string; direction: string } {
    return (
      typeof data['fromRoomId'] === 'string' &&
      typeof data['toRoomId'] === 'string' &&
      typeof data['direction'] === 'string'
    );
  }

  /**
   * Get room state for a character
   */
  getCharacterRoomState(characterId: string): RoomState {
    const character = this.characterManager.getCharacter(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    const room = this.world.getRoom(character.currentRoomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const actors = this.actorRegistry.getActorsInRoom(character.currentRoomId);
    const occupants = Array.from(actors)
      .filter((id) => id !== characterId)
      .map((id) => {
        const char = this.characterManager.getCharacter(id);
        return char
          ? {
              id: char.id,
              name: char.name,
              type: 'player' as const,
            }
          : null;
      })
      .filter((p) => p !== null);

    const exits = Array.from(room.exits.entries()).map(([direction, targetId]) => {
      const targetRoom = this.world.getRoom(targetId);
      return {
        direction,
        roomId: targetId,
        roomName: targetRoom?.name || 'Unknown',
      };
    });

    return {
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
      },
      exits,
      occupants,
      items: [],
    };
  }

  /**
   * Broadcast an event to all affected actors
   * @param event - The event to broadcast
   * @param originSocketId - Optional socket ID of the player who triggered the event
   */
  private broadcastEvent(event: GameEvent, originSocketId?: string): void {
    // Handle private events - only send to the originating player
    if (event.visibility === 'private' && originSocketId) {
      this.io.to(originSocketId).emit('game:event', event);
      return;
    }

    const affectedActors = this.eventPropagator.calculateAffectedActors(event);

    for (const [actorId, attenuatedEvent] of affectedActors) {
      if (this.actorRegistry.isPlayer(actorId)) {
        const socketId = this.actorRegistry.getSocketId(actorId);
        if (socketId) {
          this.io.to(socketId).emit('game:event', attenuatedEvent);
        }
      }
    }
  }
}
