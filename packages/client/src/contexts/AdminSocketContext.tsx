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
  setEvents: (events: AdminGameEvent[]) => void;
}

const AdminSocketContext = createContext<AdminSocketContextValue | null>(null);

export function AdminSocketProvider({ children }: { children: ReactNode }): JSX.Element {
  const [events, setEvents] = useState<AdminGameEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.info('Admin socket connected');
      newSocket.emit('admin:join');
      setIsStreaming(true);
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

  return (
    <AdminSocketContext.Provider value={{ events, isStreaming, setEvents }}>
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
