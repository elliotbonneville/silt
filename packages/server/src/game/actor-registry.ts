/**
 * Actor registry tracks all actors (players + AI agents) in the game world
 * Maintains location data and socket mappings
 */

import type { ActorId, RoomId } from '@silt/shared';

export type ActorType = 'player' | 'ai_agent';

export interface ActorLocation {
  readonly actorId: ActorId;
  readonly actorType: ActorType;
  roomId: RoomId;
  readonly socketId?: string;
}

export class ActorRegistry {
  private actors = new Map<ActorId, ActorLocation>();
  private roomOccupants = new Map<RoomId, Set<ActorId>>();
  private socketToActor = new Map<string, ActorId>();
  private actorToSocket = new Map<ActorId, string>();

  addPlayer(playerId: ActorId, roomId: RoomId, socketId: string): void {
    const location: ActorLocation = {
      actorId: playerId,
      actorType: 'player',
      roomId,
      socketId,
    };

    this.actors.set(playerId, location);
    this.socketToActor.set(socketId, playerId);
    this.actorToSocket.set(playerId, socketId);
    this.addToRoom(playerId, roomId);
  }

  addAIAgent(agentId: ActorId, roomId: RoomId): void {
    const location: ActorLocation = {
      actorId: agentId,
      actorType: 'ai_agent',
      roomId,
    };

    this.actors.set(agentId, location);
    this.addToRoom(agentId, roomId);
  }

  private addToRoom(actorId: ActorId, roomId: RoomId): void {
    const occupants = this.roomOccupants.get(roomId) || new Set();
    occupants.add(actorId);
    this.roomOccupants.set(roomId, occupants);
  }

  moveActor(actorId: ActorId, fromRoomId: RoomId, toRoomId: RoomId): void {
    const occupants = this.roomOccupants.get(fromRoomId);
    if (occupants) {
      occupants.delete(actorId);
    }

    this.addToRoom(actorId, toRoomId);

    const actor = this.actors.get(actorId);
    if (actor) {
      actor.roomId = toRoomId;
    }
  }

  getActorsInRoom(roomId: RoomId): ReadonlySet<ActorId> {
    return this.roomOccupants.get(roomId) || new Set();
  }

  getActorLocation(actorId: ActorId): ActorLocation | undefined {
    return this.actors.get(actorId);
  }

  getSocketId(actorId: ActorId): string | undefined {
    return this.actorToSocket.get(actorId);
  }

  getActorBySocketId(socketId: string): ActorId | undefined {
    return this.socketToActor.get(socketId);
  }

  isPlayer(actorId: ActorId): boolean {
    return this.actors.get(actorId)?.actorType === 'player';
  }

  isAIAgent(actorId: ActorId): boolean {
    return this.actors.get(actorId)?.actorType === 'ai_agent';
  }

  removeActor(actorId: ActorId): void {
    const actor = this.actors.get(actorId);
    if (!actor) return;

    const occupants = this.roomOccupants.get(actor.roomId);
    if (occupants) {
      occupants.delete(actorId);
    }

    if (actor.socketId) {
      this.socketToActor.delete(actor.socketId);
      this.actorToSocket.delete(actorId);
    }

    this.actors.delete(actorId);
  }

  removeBySocketId(socketId: string): void {
    const actorId = this.socketToActor.get(socketId);
    if (actorId) {
      this.removeActor(actorId);
    }
  }
}
