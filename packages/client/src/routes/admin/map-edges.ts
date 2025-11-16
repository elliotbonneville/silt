/**
 * Edge creation utilities for map visualization
 */

import { type Edge, MarkerType } from 'reactflow';
import type { RoomData } from './map-types.js';

const directionToHandle: Record<string, string> = {
  north: 'top',
  south: 'bottom',
  east: 'right',
  west: 'left',
  up: 'top',
  down: 'bottom',
  northeast: 'top-right',
  northwest: 'top-left',
  southeast: 'bottom-right',
  southwest: 'bottom-left',
};

const oppositeHandle: Record<string, string> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
  'top-right': 'bottom-left',
  'top-left': 'bottom-right',
  'bottom-right': 'top-left',
  'bottom-left': 'top-right',
};

/**
 * Check if connection is bidirectional
 */
function isBidirectional(rooms: RoomData[], roomId: string, targetId: string): boolean {
  const targetRoom = rooms.find((r) => r.id === targetId);
  if (!targetRoom) return false;
  return Object.values(targetRoom.exits).includes(roomId);
}

/**
 * Create directional edges with proper handle positions
 */
export function createEdges(roomData: RoomData[]): Edge[] {
  const flowEdges: Edge[] = [];
  const processedEdges = new Set<string>();

  for (const room of roomData) {
    for (const [direction, targetId] of Object.entries(room.exits)) {
      const edgeKey = `${room.id}-${targetId}`;
      const reverseKey = `${targetId}-${room.id}`;

      if (processedEdges.has(edgeKey) || processedEdges.has(reverseKey)) {
        continue;
      }

      const sourceHandle = directionToHandle[direction.toLowerCase()] || 'right';
      const targetHandle = oppositeHandle[sourceHandle] || 'left';
      const isTwoWay = isBidirectional(roomData, room.id, targetId);

      flowEdges.push({
        id: edgeKey,
        source: room.id,
        target: targetId,
        sourceHandle,
        targetHandle,
        type: 'straight',
        animated: false,
        style: { stroke: isTwoWay ? '#6b7280' : '#f59e0b', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: isTwoWay ? '#6b7280' : '#f59e0b' },
        ...(isTwoWay ? { markerStart: { type: MarkerType.ArrowClosed, color: '#6b7280' } } : {}),
      });

      processedEdges.add(edgeKey);
    }
  }

  return flowEdges;
}
