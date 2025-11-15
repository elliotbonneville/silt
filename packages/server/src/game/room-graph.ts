/**
 * Room graph for efficient distance calculations
 * Supports range-based event propagation
 */

export interface RoomConnection {
  readonly id: string;
  readonly exits: ReadonlyMap<string, string>;
}

export class RoomGraph {
  private adjacencyMap = new Map<string, readonly string[]>();

  constructor(rooms: readonly RoomConnection[]) {
    this.buildGraph(rooms);
  }

  private buildGraph(rooms: readonly RoomConnection[]): void {
    this.adjacencyMap.clear();

    for (const room of rooms) {
      const neighbors: string[] = [];
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
  getRoomsWithinDistance(originRoomId: string, maxDistance: number): Map<string, number> {
    const distances = new Map<string, number>();
    const queue: Array<readonly [string, number]> = [[originRoomId, 0]];
    const visited = new Set<string>();

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
