/**
 * Actor registry tracks all actors (players + AI agents) in the game world
 * Maintains location data and socket mappings
 */

export type ActorType = 'player' | 'ai_agent';

export interface ActorLocation {
  readonly actorId: string;
  readonly actorType: ActorType;
  roomId: string;
  readonly socketId?: string;
}

export class ActorRegistry {
  private actors = new Map<string, ActorLocation>();
  private roomOccupants = new Map<string, Set<string>>();
  private socketToActor = new Map<string, string>();
  private actorToSocket = new Map<string, string>();

  addPlayer(playerId: string, roomId: string, socketId: string): void {
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

  addAIAgent(agentId: string, roomId: string): void {
    const location: ActorLocation = {
      actorId: agentId,
      actorType: 'ai_agent',
      roomId,
    };

    this.actors.set(agentId, location);
    this.addToRoom(agentId, roomId);
  }

  private addToRoom(actorId: string, roomId: string): void {
    const occupants = this.roomOccupants.get(roomId) || new Set();
    occupants.add(actorId);
    this.roomOccupants.set(roomId, occupants);
  }

  moveActor(actorId: string, fromRoomId: string, toRoomId: string): void {
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

  getActorsInRoom(roomId: string): ReadonlySet<string> {
    return this.roomOccupants.get(roomId) || new Set();
  }

  getActorLocation(actorId: string): ActorLocation | undefined {
    return this.actors.get(actorId);
  }

  getSocketId(actorId: string): string | undefined {
    return this.actorToSocket.get(actorId);
  }

  getActorBySocketId(socketId: string): string | undefined {
    return this.socketToActor.get(socketId);
  }

  isPlayer(actorId: string): boolean {
    return this.actors.get(actorId)?.actorType === 'player';
  }

  isAIAgent(actorId: string): boolean {
    return this.actors.get(actorId)?.actorType === 'ai_agent';
  }

  removeActor(actorId: string): void {
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
