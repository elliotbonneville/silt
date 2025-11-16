/**
 * Room node component for ReactFlow graph
 */

import { Handle, Position } from 'reactflow';
import type { RoomData } from './map-types.js';

const handleStyle = {
  width: '12px',
  height: '12px',
  border: '2px solid #6b7280',
  background: '#1f2937',
};

const hiddenHandleStyle = {
  ...handleStyle,
  opacity: 0,
  pointerEvents: 'none' as const,
};

export function RoomNode({
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

  return (
    <>
      {/* Target handles (incoming connections) */}
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
        type="target"
        position={Position.Top}
        id="top-right"
        style={{
          ...(exitDirections.has('top-right') ? handleStyle : hiddenHandleStyle),
          left: '100%',
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

      {/* Source handles (outgoing connections) */}
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
  const occupants = room.occupantList || [];
  const playerCount = occupants.filter((o) => !o.isNpc).length;
  const npcCount = occupants.filter((o) => o.isNpc).length;

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
        {playerCount > 0 && <div className="text-green-300 text-xs">{playerCount} 👤</div>}
        {npcCount > 0 && <div className="text-yellow-300 text-xs">{npcCount} 🤖</div>}
        {room.items > 0 && <div className="text-blue-300 text-xs">{room.items} 📦</div>}
      </div>
    </button>
  );
}
