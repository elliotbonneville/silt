/**
 * Admin map view - visualize world as directional graph
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { RoomDetailPanel } from '../../components/admin/RoomDetailPanel.js';
import { useAdminSocketContext } from '../../contexts/AdminSocketContext.js';
import { createEdges } from './map-edges.js';
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
  const [panelWidth, setPanelWidth] = useState(384); // 24rem = 384px
  const [isResizing, setIsResizing] = useState(false);
  const nodePositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const lastProcessedEventRef = useRef<string>('');
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

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
          isSelected: false,
          onClick: () => setSelectedRoom(room),
        },
      }));

      // Create edges
      const flowEdges = createEdges(roomData);

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (error) {
      console.error('Failed to load map data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

  // Update node selection state when selectedRoom changes
  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isSelected: node.id === selectedRoom?.id,
        },
      })),
    );
  }, [selectedRoom?.id]);

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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isResizing || !resizeRef.current) return;
      const delta = resizeRef.current.startX - e.clientX;
      const newWidth = resizeRef.current.startWidth + delta;
      setPanelWidth(Math.max(300, Math.min(800, newWidth)));
    };

    const handleMouseUp = (): void => {
      setIsResizing(false);
      resizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isResizing]);

  const handleMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startWidth: panelWidth,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

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

      {/* Resize handle */}
      {selectedRoom && (
        <button
          type="button"
          onMouseDown={handleMouseDown}
          className="w-1 bg-gray-700 hover:bg-cyan-500 cursor-col-resize transition-colors select-none"
        />
      )}

      {/* Side panel - resizable */}
      {selectedRoom ? (
        <div style={{ width: `${panelWidth}px`, minWidth: '300px', maxWidth: '800px' }}>
          <RoomDetailPanel
            room={selectedRoom}
            events={allEvents}
            onClose={() => setSelectedRoom(null)}
          />
        </div>
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
