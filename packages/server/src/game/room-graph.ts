/**
 * Room graph for efficient distance calculations
 * Supports range-based event propagation
 */

import type { RoomId } from '@silt/shared';

export interface RoomConnection {
  readonly id: RoomId;
  readonly exits: ReadonlyMap<string, RoomId>;
}

export class RoomGraph {
  private adjacencyMap = new Map<RoomId, readonly RoomId[]>();

  constructor(rooms: readonly RoomConnection[]) {
    this.buildGraph(rooms);
  }

  private buildGraph(rooms: readonly RoomConnection[]): void {
    this.adjacencyMap.clear();

    for (const room of rooms) {
      const neighbors: RoomId[] = [];
      for (const [, neighborId] of room.exits) {
        neighbors.push(neighborId);
      }
      this.adjacencyMap.set(room.id, neighbors);
    }
  }

  /**
   * Find all rooms within N steps using BFS
   * Returns Map of roomId → distance from origin
   */
  getRoomsWithinDistance(originRoomId: RoomId, maxDistance: number): Map<RoomId, number> {
    const distances = new Map<RoomId, number>();
    const queue: Array<readonly [RoomId, number]> = [[originRoomId, 0]];
    const visited = new Set<RoomId>();

    while (queue.length > 0) {
      const entry = queue.shift();
      if (!entry) break;

      const [roomId, distance] = entry;

      if (visited.has(roomId)) continue;
      visited.add(roomId);
      distances.set(roomId, distance);

      if (distance >= maxDistance) continue;

      const neighbors = this.adjacencyMap.get(roomId) || [];
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          queue.push([neighborId, distance + 1]);
        }
      }
    }

    return distances;
  }

  /**
   * Rebuild graph when rooms are added/removed
   */
  rebuild(rooms: readonly RoomConnection[]): void {
    this.buildGraph(rooms);
  }
}
