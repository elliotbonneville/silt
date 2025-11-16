/**
 * Room detail panel for admin map view
 */

import type { AdminGameEvent } from '@silt/shared';
import { useEffect, useMemo, useState } from 'react';

const serverUrl = import.meta.env.VITE_SERVER_URL;
const SERVER_URL = serverUrl ?? 'http://localhost:3000';

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

export function RoomDetailPanel({
  room,
  events,
  onClose,
}: {
  room: RoomData;
  events: readonly AdminGameEvent[];
  onClose: () => void;
}): JSX.Element {
  const exits = Object.entries(room.exits);
  const [historicalEvents, setHistoricalEvents] = useState<AdminGameEvent[]>([]);

  // Load historical events for this room
  useEffect(() => {
    async function loadRoomEvents(): Promise<void> {
      try {
        const params = new URLSearchParams({
          limit: '50',
          roomId: room.id,
        });
        const response = await fetch(`${SERVER_URL}/admin/events?${params}`);
        const data = await response.json();
        setHistoricalEvents(data.events || []);
      } catch (error) {
        console.error('Failed to load room events:', error);
      }
    }
    loadRoomEvents();
  }, [room.id]);

  // Combine historical + live events for this room
  const roomEvents = useMemo(() => {
    // Filter events relevant to this room - only show events that originated here
    // Movement arrivals are handled by the destination room's own broadcast
    const liveRoomEvents = events.filter((e) => e.originRoomId === room.id);

    // Merge and deduplicate by ID
    const allEvents = [...liveRoomEvents, ...historicalEvents];
    const uniqueEvents = Array.from(new Map(allEvents.map((e) => [e.id, e])).values());
    // Sort by timestamp descending (newest first)
    return uniqueEvents.sort((a, b) => b.timestamp - a.timestamp);
  }, [events, historicalEvents, room.id]);

  return (
    <div className="w-full h-full border-l border-gray-700 bg-gray-800 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-cyan-400">{room.name}</h3>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-xl">
          ×
        </button>
      </div>

      <div className="space-y-4 text-sm flex-shrink-0">
        <div>
          <div className="text-gray-500 text-xs mb-1">ID</div>
          <div className="font-mono text-gray-300">{room.id}</div>
        </div>

        <div>
          <div className="text-gray-500 text-xs mb-1">Description</div>
          <div className="text-gray-300">{room.description}</div>
        </div>

        <div>
          <div className="text-gray-500 text-xs mb-1">Exits ({exits.length})</div>
          <div className="space-y-1">
            {exits.length === 0 ? (
              <div className="text-gray-500 text-xs">No exits</div>
            ) : (
              exits.map(([direction, targetRoomId]) => (
                <div key={direction} className="flex items-center gap-3">
                  <span className="text-yellow-400 text-xs w-20 flex-shrink-0">{direction}:</span>
                  <span className="font-mono text-gray-400 text-xs truncate">{targetRoomId}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="text-gray-500 text-xs mb-1">Occupants ({room.occupants})</div>
          {room.occupantList && room.occupantList.length > 0 ? (
            <div className="space-y-1">
              {room.occupantList.map((char) => (
                <div key={char.id} className="flex items-center gap-2 text-xs">
                  <span className="text-yellow-300">
                    {char.isNpc ? '🤖' : '👤'} {char.name}
                  </span>
                  <span className="text-gray-500">
                    {char.hp}/{char.maxHp} HP
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-xs">Empty</div>
          )}
        </div>

        <div>
          <div className="text-gray-500 text-xs mb-1">Items ({room.items})</div>
          {room.itemList && room.itemList.length > 0 ? (
            <div className="space-y-1">
              {room.itemList.map((item) => (
                <div key={item.id} className="text-xs">
                  <span className="text-blue-300">📦 {item.name}</span>
                  <span className="text-gray-500 ml-2">({item.itemType})</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-xs">None</div>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0 mt-4">
        <div className="text-gray-500 text-xs mb-2">
          Recent Events ({roomEvents.length})<span className="ml-2 text-green-400">● Live</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 bg-gray-900 rounded p-3 font-mono">
          {roomEvents.length === 0 ? (
            <div className="text-gray-500 text-sm">No recent events</div>
          ) : (
            roomEvents.map((event) => (
              <div key={event.id} className="text-sm border-l-2 border-gray-700 pl-3 py-1">
                <div className="text-gray-500 text-xs mb-1">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>
                <div className="text-gray-300">{event.content || event.type}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
