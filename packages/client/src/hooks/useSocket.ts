/**
 * Socket.io hook for managing WebSocket connection
 */

import type { CommandOutput, GameEvent } from '@silt/shared';
import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

interface GameEventWithData extends GameEvent {
  structuredData?: unknown;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  events: readonly GameEventWithData[];
  error: string | null;
}

const serverUrl = import.meta.env.VITE_SERVER_URL;
const SERVER_URL = serverUrl ?? 'http://localhost:3000';

export function useSocket(): UseSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<GameEventWithData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.info('Connected to server');
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      console.info('Disconnected from server');
      setIsConnected(false);
    });

    socket.on('game:event', (event: GameEvent) => {
      setEvents((prev) => [...prev, event]);
    });

    socket.on('game:output', (output: CommandOutput) => {
      // Convert structured output to synthetic event with structured data attached
      const outputEvent: GameEventWithData = {
        id: `output-${Date.now()}`,
        type: output.type === 'room' ? 'room_description' : 'system',
        timestamp: Date.now(),
        originRoomId: '',
        content: output.text,
        relatedEntities: [],
        visibility: 'private',
        structuredData: output, // Attach the full structured output
      };
      setEvents((prev) => [...prev, outputEvent]);
    });

    socket.on('game:error', (data: { message: string }) => {
      setError(data.message);
      setTimeout(() => setError(null), 5000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    events,
    error,
  };
}
