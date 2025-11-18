/**
 * Admin socket context - shared socket connection for all admin views
 */

import type { AdminGameEvent } from '@silt/shared';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

const serverUrl = import.meta.env.VITE_SERVER_URL;
const SERVER_URL = serverUrl ?? 'http://localhost:3000';

interface AdminSocketContextValue {
  events: AdminGameEvent[];
  isStreaming: boolean;
  isPaused: boolean;
  setEvents: (events: AdminGameEvent[]) => void;
  togglePause: () => Promise<void>;
}

const AdminSocketContext = createContext<AdminSocketContextValue | null>(null);

export function AdminSocketProvider({ children }: { children: ReactNode }): JSX.Element {
  const [events, setEvents] = useState<AdminGameEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.info('Admin socket connected');
      newSocket.emit('admin:join');
      setIsStreaming(true);

      // Fetch initial pause state
      fetch(`${SERVER_URL}/admin/status`)
        .then((res) => res.json())
        .then((data: { paused: boolean }) => {
          setIsPaused(data.paused);
        })
        .catch((error) => {
          console.error('Failed to fetch pause status:', error);
        });
    });

    newSocket.on('admin:game-event', (event: AdminGameEvent) => {
      setEvents((prev) => [event, ...prev]);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('admin:leave');
        socketRef.current.disconnect();
      }
    };
  }, []);

  const togglePause = async (): Promise<void> => {
    try {
      const endpoint = isPaused ? '/admin/resume' : '/admin/pause';
      const response = await fetch(`${SERVER_URL}${endpoint}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to toggle pause');
      }

      const data: unknown = await response.json();
      if (
        typeof data === 'object' &&
        data !== null &&
        'success' in data &&
        typeof data.success === 'boolean' &&
        'paused' in data &&
        typeof data.paused === 'boolean' &&
        data.success
      ) {
        setIsPaused(data.paused);
      }
    } catch (error) {
      console.error('Failed to toggle pause:', error);
    }
  };

  return (
    <AdminSocketContext.Provider value={{ events, isStreaming, isPaused, setEvents, togglePause }}>
      {children}
    </AdminSocketContext.Provider>
  );
}

export function useAdminSocketContext(): AdminSocketContextValue {
  const context = useContext(AdminSocketContext);
  if (!context) {
    throw new Error('useAdminSocketContext must be used within AdminSocketProvider');
  }
  return context;
}
