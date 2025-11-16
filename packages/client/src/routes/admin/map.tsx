/**
 * Admin map view - visualize world as directional graph
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  Handle,
  MarkerType,
  MiniMap,
  type Node,
  type NodeTypes,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { RoomDetailPanel } from '../../components/admin/RoomDetailPanel.js';
import { useAdminSocketContext } from '../../contexts/AdminSocketContext.js';

const serverUrl = import.meta.env.VITE_SERVER_URL;
const SERVER_URL = serverUrl ?? 'http://localhost:3000';

const ROOM_SPACING = 300; // Pixels between rooms

interface RoomData {
  id: string;
  name: string;
  description: string;
  exits: Record<string, string>;
  occupants: number;
  items: number;
  occupantList?: Array<{
    id: string;
    name: string;
    isNpc: boolean;
    hp: number;
    maxHp: number;
  }>;
  itemList?: Array<{
    id: string;
    name: string;
    itemType: string;
  }>;
}

/**
 * Calculate room positions based on directional connections
 * Uses BFS to position rooms spatially (north=up, south=down, east=right, west=left)
 */
function calculateRoomPositions(rooms: RoomData[]): Record<string, { x: number; y: number }> {
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

// Define node types outside component to avoid recreation
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

function RoomNode({
  data,
}: {
  data: { room: RoomData; isSelected: boolean; onClick: () => void };
}): JSX.Element {
  const { room, isSelected, onClick } = data;

  // Determine which handles to show based on exits
  const exitDirections = new Set(
    Object.keys(room.exits).map((dir) => {
      const d = dir.toLowerCase();
      if (d === 'north' || d === 'up') return 'top';
      if (d === 'south' || d === 'down') return 'bottom';
      if (d === 'east') return 'right';
      if (d === 'west') return 'left';
      if (d === 'northeast') return 'top-right';
      if (d === 'northwest') return 'top-left';
      if (d === 'southeast') return 'bottom-right';
      if (d === 'southwest') return 'bottom-left';
      return '';
    }),
  );

  const handleStyle = { background: '#6b7280', width: 8, height: 8 };
  const hiddenHandleStyle = { opacity: 0, pointerEvents: 'none' as const };

  return (
    <>
      {/* Cardinal direction handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={exitDirections.has('top') ? handleStyle : hiddenHandleStyle}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        style={exitDirections.has('bottom') ? handleStyle : hiddenHandleStyle}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={exitDirections.has('left') ? handleStyle : hiddenHandleStyle}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        style={exitDirections.has('right') ? handleStyle : hiddenHandleStyle}
      />

      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={exitDirections.has('top') ? handleStyle : hiddenHandleStyle}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={exitDirections.has('bottom') ? handleStyle : hiddenHandleStyle}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={exitDirections.has('left') ? handleStyle : hiddenHandleStyle}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={exitDirections.has('right') ? handleStyle : hiddenHandleStyle}
      />

      {/* Corner handles for diagonal connections */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-right"
        style={{
          ...(exitDirections.has('top-right') ? handleStyle : hiddenHandleStyle),
          left: '100%',
          top: 0,
          transform: 'translate(-50%, -50%)',
        }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-left"
        style={{
          ...(exitDirections.has('top-left') ? handleStyle : hiddenHandleStyle),
          left: 0,
          top: 0,
          transform: 'translate(-50%, -50%)',
        }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-right"
        style={{
          ...(exitDirections.has('bottom-right') ? handleStyle : hiddenHandleStyle),
          left: '100%',
          top: '100%',
          transform: 'translate(-50%, -50%)',
        }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-left"
        style={{
          ...(exitDirections.has('bottom-left') ? handleStyle : hiddenHandleStyle),
          left: 0,
          top: '100%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <Handle
        type="source"
        position={Position.Top}
        id="top-right"
        style={{
          ...(exitDirections.has('top-right') ? handleStyle : hiddenHandleStyle),
          left: '100%',
          top: 0,
          transform: 'translate(-50%, -50%)',
        }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-left"
        style={{
          ...(exitDirections.has('top-left') ? handleStyle : hiddenHandleStyle),
          left: 0,
          top: 0,
          transform: 'translate(-50%, -50%)',
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-right"
        style={{
          ...(exitDirections.has('bottom-right') ? handleStyle : hiddenHandleStyle),
          left: '100%',
          top: '100%',
          transform: 'translate(-50%, -50%)',
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-left"
        style={{
          ...(exitDirections.has('bottom-left') ? handleStyle : hiddenHandleStyle),
          left: 0,
          top: '100%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <RoomNodeContent room={room} isSelected={isSelected} onClick={onClick} />
    </>
  );
}

function RoomNodeContent({
  room,
  isSelected,
  onClick,
}: {
  room: RoomData;
  isSelected: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border-2 bg-gray-800 p-3 text-left text-xs transition-all flex flex-col ${
        isSelected
          ? 'border-cyan-400 shadow-lg shadow-cyan-400/50'
          : 'border-gray-600 hover:border-gray-500'
      }`}
      style={{ width: '140px', height: '140px' }}
    >
      <div className="font-semibold text-cyan-400 truncate mb-2">{room.name}</div>
      <div className="space-y-1">
        {room.occupants > 0 && <div className="text-yellow-300 text-xs">{room.occupants} 👤</div>}
        {room.items > 0 && <div className="text-blue-300 text-xs">{room.items} 📦</div>}
      </div>
    </button>
  );
}

export default AdminMap;
