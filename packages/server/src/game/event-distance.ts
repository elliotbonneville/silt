/**
 * Room distance calculations for event propagation
 */

import { findRoomById, getRoomExits } from '../database/index.js';

/**
 * Find all rooms within N steps using BFS (queries Prisma)
 * Returns Map of roomId → distance from origin
 */
export async function getRoomsWithinDistance(
  originRoomId: string,
  maxDistance: number,
): Promise<Map<string, number>> {
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

    // Get neighbors from room exits (query Prisma)
    const dbRoom = await findRoomById(roomId);
    if (!dbRoom) continue;

    const exits = getRoomExits(dbRoom);
    const neighbors = Object.values(exits);

    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        queue.push([neighborId, distance + 1]);
      }
    }
  }

  return distances;
}
