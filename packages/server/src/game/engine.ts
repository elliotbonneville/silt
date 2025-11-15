/**
 * Game engine - integrates all game systems
 * Manages world state, actors, and event propagation
 */

import type { ActorId, GameEvent, RoomId, RoomState } from '@silt/shared';
import { createEventId } from '@silt/shared';
import type { Server } from 'socket.io';
import { ActorRegistry } from './actor-registry.js';
import { type CommandContext, parseAndExecuteCommand } from './commands.js';
import { EventPropagator } from './event-propagator.js';
import { createPlayer, type Player } from './player.js';
import { RoomGraph } from './room-graph.js';
import { World } from './world.js';

export class GameEngine {
  private readonly world: World;
  private readonly actorRegistry: ActorRegistry;
  private roomGraph!: RoomGraph;
  private eventPropagator!: EventPropagator;
  private readonly players = new Map<ActorId, Player>();
  private initialized = false;

  constructor(private readonly io: Server) {
    this.world = new World();
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
        .map((id) => this.players.get(id))
        .filter((p): p is Player => p !== null && p !== undefined);
    });

    // Build room graph for distance calculations
    const rooms = this.world.getAllRooms();
    this.roomGraph = new RoomGraph(rooms);

    // Event propagator uses room graph and actor registry
    this.eventPropagator = new EventPropagator(this.roomGraph, this.actorRegistry);

    this.initialized = true;
  }

  /**
   * Add a player to the game
   */
  async addPlayer(socketId: string, name: string): Promise<Player> {
    if (!this.initialized) {
      throw new Error('Game engine not initialized');
    }

    const startingRoomId = this.world.getStartingRoomId();
    const player = createPlayer(name, startingRoomId);

    this.players.set(player.id, player);
    this.actorRegistry.addPlayer(player.id, startingRoomId, socketId);

    // Broadcast player entered event to others in room
    this.broadcastEvent({
      id: createEventId(`event-${Date.now()}-entered`),
      type: 'player_entered',
      timestamp: Date.now(),
      originRoomId: startingRoomId,
      content: `${player.name} has entered the room.`,
      relatedEntities: [],
      visibility: 'room',
    });

    // Send initial room description to the joining player
    const roomDescription = await this.world.getRoomDescription(startingRoomId, player.name);

    this.broadcastEvent(
      {
        id: createEventId(`event-${Date.now()}-initial-look`),
        type: 'room_description',
        timestamp: Date.now(),
        originRoomId: startingRoomId,
        content: roomDescription,
        relatedEntities: [],
        visibility: 'private',
      },
      socketId,
    );

    return player;
  }

  /**
   * Remove a player from the game
   */
  removePlayer(socketId: string): void {
    const actorId = this.actorRegistry.getActorBySocketId(socketId);
    if (!actorId) return;

    const player = this.players.get(actorId);
    if (!player) return;

    // Broadcast player left event
    this.broadcastEvent({
      id: createEventId(`event-${Date.now()}`),
      type: 'player_left',
      timestamp: Date.now(),
      originRoomId: player.currentRoomId,
      content: `${player.name} has left the room.`,
      relatedEntities: [],
      visibility: 'room',
    });

    this.actorRegistry.removeBySocketId(socketId);
    this.players.delete(actorId);
  }

  /**
   * Handle a command from a player
   */
  async handleCommand(socketId: string, commandText: string): Promise<void> {
    const actorId = this.actorRegistry.getActorBySocketId(socketId);
    if (!actorId) {
      throw new Error('Player not found');
    }

    const player = this.players.get(actorId);
    if (!player) {
      throw new Error('Player not found');
    }

    const context: CommandContext = {
      player,
      world: this.world,
    };

    const result = await parseAndExecuteCommand(commandText, context);

    if (!result.success && result.error) {
      // Send error only to the player who issued the command
      this.io.to(socketId).emit('game:error', { message: result.error });
      return;
    }

    // Handle movement commands (update actor location)
    if (result.success && result.events.length > 0) {
      const moveEvent = result.events.find((e) => e.type === 'movement');
      if (moveEvent?.data && this.isMovementData(moveEvent.data)) {
        // Update player location
        player.currentRoomId = moveEvent.data.toRoomId;
        this.actorRegistry.moveActor(player.id, moveEvent.data.fromRoomId, moveEvent.data.toRoomId);
      }
    }

    // Broadcast all events
    for (const event of result.events) {
      this.broadcastEvent(event, socketId);
    }
  }

  /**
   * Type guard for movement event data
   */
  private isMovementData(
    data: Record<string, unknown>,
  ): data is { fromRoomId: RoomId; toRoomId: RoomId; direction: string } {
    return (
      typeof data['fromRoomId'] === 'string' &&
      typeof data['toRoomId'] === 'string' &&
      typeof data['direction'] === 'string'
    );
  }

  /**
   * Get room state for a player
   */
  getPlayerRoomState(playerId: ActorId): RoomState {
    const player = this.players.get(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const room = this.world.getRoom(player.currentRoomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const actors = this.actorRegistry.getActorsInRoom(player.currentRoomId);
    const occupants = Array.from(actors)
      .filter((id) => id !== playerId)
      .map((id) => {
        const p = this.players.get(id);
        return p
          ? {
              id: p.id,
              name: p.name,
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
