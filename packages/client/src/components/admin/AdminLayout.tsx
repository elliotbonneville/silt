/**
 * Admin layout - header and navigation
 */

import { Link, Outlet, useLocation } from 'react-router';
import { AdminSocketProvider, useAdminSocketContext } from '../../contexts/AdminSocketContext.js';

function AdminLayoutContent(): JSX.Element {
  const location = useLocation();
  const { isStreaming } = useAdminSocketContext();

  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-green-400">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm">
              Real-time game events and AI decision monitoring
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isStreaming && (
              <div className="flex items-center gap-2 text-green-400">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm">Streaming</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 bg-gray-800">
        <Link
          to="/admin/events"
          className={`px-6 py-3 font-semibold ${
            location.pathname === '/admin/events' || location.pathname === '/admin'
              ? 'border-b-2 border-green-400 text-green-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Events
        </Link>
        <Link
          to="/admin/map"
          className={`px-6 py-3 font-semibold ${
            location.pathname === '/admin/map'
              ? 'border-b-2 border-purple-400 text-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Map
        </Link>
      </div>

      {/* Route content */}
      <Outlet />
    </div>
  );
}

export function AdminLayout(): JSX.Element {
  return (
    <AdminSocketProvider>
      <AdminLayoutContent />
    </AdminSocketProvider>
  );
}
