/**
 * Room positioning algorithm for map layout
 */

import type { RoomData } from './map-types.js';

const ROOM_SPACING = 300; // Pixels between rooms

/**
 * Calculate room positions based on directional connections
 * Uses BFS to position rooms spatially (north=up, south=down, east=right, west=left)
 */
export function calculateRoomPositions(
  rooms: RoomData[],
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const visited = new Set<string>();

  // Direction offsets (north=up=-y, south=down=+y, east=right=+x, west=left=-x)
  const directionOffsets: Record<string, { x: number; y: number }> = {
    north: { x: 0, y: -ROOM_SPACING },
    south: { x: 0, y: ROOM_SPACING },
    east: { x: ROOM_SPACING, y: 0 },
    west: { x: -ROOM_SPACING, y: 0 },
    up: { x: 0, y: -ROOM_SPACING * 1.5 },
    down: { x: 0, y: ROOM_SPACING * 1.5 },
    northeast: { x: ROOM_SPACING * 0.7, y: -ROOM_SPACING * 0.7 },
    northwest: { x: -ROOM_SPACING * 0.7, y: -ROOM_SPACING * 0.7 },
    southeast: { x: ROOM_SPACING * 0.7, y: ROOM_SPACING * 0.7 },
    southwest: { x: -ROOM_SPACING * 0.7, y: ROOM_SPACING * 0.7 },
  };

  // Start with first room at origin
  if (rooms.length === 0) return positions;

  const startRoom = rooms[0];
  if (!startRoom) return positions;

  const queue: Array<{ roomId: string; x: number; y: number }> = [
    { roomId: startRoom.id, x: 0, y: 0 },
  ];
  positions[startRoom.id] = { x: 0, y: 0 };
  visited.add(startRoom.id);

  // BFS to position connected rooms
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const room = rooms.find((r) => r.id === current.roomId);
    if (!room) continue;

    for (const [direction, targetId] of Object.entries(room.exits)) {
      if (visited.has(targetId)) continue;

      const offset = directionOffsets[direction.toLowerCase()] || { x: ROOM_SPACING, y: 0 };
      const newPos = {
        x: current.x + offset.x,
        y: current.y + offset.y,
      };

      positions[targetId] = newPos;
      visited.add(targetId);
      queue.push({ roomId: targetId, x: newPos.x, y: newPos.y });
    }
  }

  // Position any unvisited rooms (disconnected)
  rooms.forEach((room, index) => {
    if (!positions[room.id]) {
      positions[room.id] = {
        x: ROOM_SPACING * 10,
        y: index * ROOM_SPACING,
      };
    }
  });

  return positions;
}
