/**
 * Admin map view - visualize world as directional graph
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  MarkerType,
  MiniMap,
  type Node,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { RoomDetailPanel } from '../../components/admin/RoomDetailPanel.js';
import { useAdminSocketContext } from '../../contexts/AdminSocketContext.js';
import { calculateRoomPositions } from './map-layout.js';
import type { RoomData } from './map-types.js';
import { RoomNode } from './RoomNode.js';

const serverUrl = import.meta.env.VITE_SERVER_URL;
const SERVER_URL = serverUrl ?? 'http://localhost:3000';

const nodeTypes: NodeTypes = {
  roomNode: RoomNode,
};

export function AdminMap(): JSX.Element {
  const { events: allEvents } = useAdminSocketContext();
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const nodePositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const lastProcessedEventRef = useRef<string>('');

  const loadMapData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/admin/map`);
      const data = await response.json();
      const roomData: RoomData[] = data.rooms || [];

      // Calculate spatial positions based on directional connections
      const positions = calculateRoomPositions(roomData);
      nodePositionsRef.current = positions;

      // Convert rooms to ReactFlow nodes with custom type
      const flowNodes: Node[] = roomData.map((room) => ({
        id: room.id,
        type: 'roomNode',
        position: positions[room.id] || { x: 0, y: 0 },
        data: {
          room,
          isSelected: selectedRoom?.id === room.id,
          onClick: () => setSelectedRoom(room),
        },
      }));

      // Map directions to handle IDs (including corners)
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

      // Check if connection is bidirectional
      const isBidirectional = (roomId: string, targetId: string): boolean => {
        const targetRoom = roomData.find((r) => r.id === targetId);
        if (!targetRoom) return false;
        return Object.values(targetRoom.exits).includes(roomId);
      };

      // Create directional edges with proper handle positions
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
          const isTwoWay = isBidirectional(room.id, targetId);

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
            ...(isTwoWay
              ? { markerStart: { type: MarkerType.ArrowClosed, color: '#6b7280' } }
              : {}),
          });

          processedEdges.add(edgeKey);
        }
      }

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (error) {
      console.error('Failed to load map data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedRoom?.id]);

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

  // Update room data reactively based on events
  useEffect(() => {
    if (allEvents.length === 0) return;

    const latestEvent = allEvents[0];
    if (!latestEvent) return;

    // Skip if we already processed this event
    if (lastProcessedEventRef.current === latestEvent.id) return;

    // Only update on relevant event types
    const eventType = latestEvent.type;
    const shouldUpdate =
      eventType === 'player_entered' ||
      eventType === 'player_left' ||
      eventType === 'movement' ||
      eventType === 'death' ||
      eventType === 'item_pickup' ||
      eventType === 'item_drop';

    if (!shouldUpdate) return;

    // Mark as processed
    lastProcessedEventRef.current = latestEvent.id;

    // Refetch map data
    async function updateMapData(): Promise<void> {
      if (!latestEvent) return;

      try {
        console.info('[Admin Map] Updating due to', latestEvent.type);
        const response = await fetch(`${SERVER_URL}/admin/map`);
        const data = await response.json();
        const updatedRooms: RoomData[] = data.rooms || [];

        // Update selected room if still selected
        if (selectedRoom) {
          const updatedRoom = updatedRooms.find((r) => r.id === selectedRoom.id);
          if (updatedRoom) {
            setSelectedRoom(updatedRoom);
          }
        }

        // Regenerate nodes with updated room data but preserved positions
        setNodes((currentNodes) =>
          updatedRooms.map((room) => {
            const existingNode = currentNodes.find((n) => n.id === room.id);
            return {
              id: room.id,
              type: 'roomNode',
              position: existingNode?.position ||
                nodePositionsRef.current[room.id] || { x: 0, y: 0 },
              data: {
                room,
                isSelected: selectedRoom?.id === room.id,
                onClick: () => setSelectedRoom(room),
              },
            };
          }),
        );
      } catch (error) {
        console.error('Failed to update room data:', error);
      }
    }

    updateMapData();
  }, [allEvents, selectedRoom]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-950">
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* ReactFlow graph */}
      <div className="flex-1 bg-gray-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#374151" gap={16} />
          <Controls />
          <MiniMap nodeColor="#1f2937" maskColor="#00000080" />
        </ReactFlow>
      </div>

      {/* Side panel - always visible */}
      {selectedRoom ? (
        <RoomDetailPanel
          room={selectedRoom}
          events={allEvents}
          onClose={() => setSelectedRoom(null)}
        />
      ) : (
        <div className="w-96 border-l border-gray-700 bg-gray-800 p-4 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">🗺️</div>
            <div className="text-sm">Select a room to view details</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminMap;
