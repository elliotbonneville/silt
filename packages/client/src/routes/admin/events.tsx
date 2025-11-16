/**
 * Admin events view
 */

import type { AdminGameEvent } from '@silt/shared';
import { useCallback, useEffect, useState } from 'react';
import { useAdminSocketContext } from '../../contexts/AdminSocketContext.js';

const serverUrl = import.meta.env.VITE_SERVER_URL;
const SERVER_URL = serverUrl ?? 'http://localhost:3000';

function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function AdminEvents(): JSX.Element {
  const { events, setEvents } = useAdminSocketContext();
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [startTime, setStartTime] = useState<string>(() => {
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    return formatDateTimeLocal(yesterday);
  });
  const [endTime, setEndTime] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadHistoricalEvents = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '500',
        offset: '0',
        ...(eventTypeFilter !== 'all' ? { types: eventTypeFilter } : {}),
        ...(startTime ? { startTime: new Date(startTime).getTime().toString() } : {}),
        ...(endTime ? { endTime: new Date(endTime).getTime().toString() } : {}),
      });

      const response = await fetch(`${SERVER_URL}/admin/events?${params}`);
      const data = await response.json();

      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to load historical events:', error);
    } finally {
      setLoading(false);
    }
  }, [eventTypeFilter, startTime, endTime, setEvents]);

  useEffect(() => {
    loadHistoricalEvents();
  }, [loadHistoricalEvents]);

  const allEventTypes = ['all', ...new Set(events.map((e) => e.type))].sort();

  const filteredEvents = events.filter((event) => {
    if (eventTypeFilter !== 'all' && event.type !== eventTypeFilter) return false;
    if (startTime && event.timestamp < new Date(startTime).getTime()) return false;
    if (endTime && event.timestamp > new Date(endTime).getTime()) return false;
    if (searchText && !JSON.stringify(event).toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <>
      {/* Search bar */}
      <div className="flex gap-2 border-b border-gray-700 bg-gray-800 p-4">
        <input
          type="text"
          placeholder="Search..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="flex-1 rounded bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400"
        />
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded bg-gray-700 px-3 py-2 text-sm text-white"
          title="Start time"
        />
        <input
          type="datetime-local"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="rounded bg-gray-700 px-3 py-2 text-sm text-white"
          title="End time"
        />
      </div>

      {/* Main content with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-700 bg-gray-800 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-400">FILTERS</h3>
            <button
              type="button"
              onClick={() => {
                setEventTypeFilter('all');
                const yesterday = new Date();
                yesterday.setHours(yesterday.getHours() - 24);
                setStartTime(formatDateTimeLocal(yesterday));
                setEndTime('');
                setSearchText('');
              }}
              className="rounded bg-gray-600 px-3 py-1 text-xs hover:bg-gray-700"
            >
              Reset
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="event-type-filter" className="mb-2 block text-xs text-gray-400">
                Event Type
              </label>
              <select
                id="event-type-filter"
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="w-full rounded bg-gray-700 px-3 py-2 text-sm text-white"
              >
                {allEventTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Events' : type}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="text-xs text-gray-500">
                {filteredEvents.length} / {events.length} events
              </div>
            </div>
          </div>
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {loading ? (
              <div className="text-center text-gray-500 py-8">Loading historical events...</div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No events found. Waiting for game activity...
              </div>
            ) : (
              filteredEvents.map((event) => <EventCard key={event.id} event={event} />)
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function EventCard({ event }: { event: AdminGameEvent }): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const time = new Date(event.timestamp).toLocaleTimeString();

  const eventTypeColors: Record<string, string> = {
    speech: 'text-green-400',
    shout: 'text-green-500',
    emote: 'text-purple-400',
    whisper: 'text-green-300',
    movement: 'text-yellow-400',
    combat_hit: 'text-red-400',
    combat_start: 'text-orange-400',
    death: 'text-red-600',
    item_pickup: 'text-blue-400',
    item_drop: 'text-blue-400',
    item_equip: 'text-blue-500',
    player_entered: 'text-yellow-300',
    player_left: 'text-yellow-300',
    room_description: 'text-cyan-400',
    ambient: 'text-gray-400',
    system: 'text-gray-300',
    connection: 'text-gray-500',
    state_change: 'text-purple-300',
  };

  const eventTypeColor = eventTypeColors[event.type] || 'text-gray-300';
  const isAIEvent = event.type.startsWith('ai:');
  const badge = isAIEvent
    ? { text: 'AI', color: 'bg-blue-900 text-blue-200' }
    : { text: 'GAME', color: 'bg-gray-900 text-gray-300' };

  return (
    <div className="rounded border border-gray-700 bg-gray-800 p-3 font-mono text-sm">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="rounded bg-gray-900 px-2 py-0.5 text-gray-500 text-xs">{time}</span>
          <span className={`rounded px-2 py-0.5 text-xs ${badge.color}`}>{badge.text}</span>
          <span className={`font-semibold ${eventTypeColor}`}>{event.type}</span>
          {isAIEvent &&
            event.data &&
            typeof event.data === 'object' &&
            'agentName' in event.data &&
            typeof event.data['agentName'] === 'string' && (
              <span className="text-yellow-300">{event.data['agentName']}</span>
            )}
          {isAIEvent &&
            event.data &&
            typeof event.data === 'object' &&
            'reasoning' in event.data &&
            typeof event.data['reasoning'] === 'string' && (
              <span className="text-gray-400 text-xs italic max-w-md truncate">
                {event.data['reasoning']}
              </span>
            )}
          {!isAIEvent && event.recipients && (
            <span className="text-gray-400 text-xs">→ {event.recipients.length} recipients</span>
          )}
        </div>
        <span className="text-gray-400">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <pre className="mt-2 overflow-x-auto text-xs text-gray-300">
          {JSON.stringify(event, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default AdminEvents;
