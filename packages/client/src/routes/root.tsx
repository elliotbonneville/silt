/**
 * Root layout - manages socket connection for all routes
 */

import { Outlet } from 'react-router';
import { useSocket } from '../hooks/useSocket.js';

export function RootLayout(): JSX.Element {
  const socketState = useSocket();

  if (!socketState.isConnected) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-green-400">
        <div className="text-center">
          <div className="mb-4 text-2xl">Connecting to server...</div>
          <div className="animate-pulse">⟳</div>
        </div>
      </div>
    );
  }

  return <Outlet context={socketState} />;
}
