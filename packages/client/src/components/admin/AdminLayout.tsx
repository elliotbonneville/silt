/**
 * Admin layout - header and navigation
 */

import { Link, Outlet, useLocation } from 'react-router';
import { AdminSocketProvider, useAdminSocketContext } from '../../contexts/AdminSocketContext.js';

function AdminLayoutContent(): JSX.Element {
  const location = useLocation();
  const { isStreaming, isPaused, togglePause } = useAdminSocketContext();

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
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => void togglePause()}
              className={`flex items-center gap-2 rounded px-4 py-2 font-semibold transition-colors ${
                isPaused
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
              }`}
            >
              {isPaused ? (
                <>
                  <span>▶️</span>
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <span>⏸️</span>
                  <span>Pause</span>
                </>
              )}
            </button>
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
        <Link
          to="/admin/agents"
          className={`px-6 py-3 font-semibold ${
            location.pathname === '/admin/agents'
              ? 'border-b-2 border-cyan-400 text-cyan-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          AI Agents
        </Link>
        <Link
          to="/admin/analytics"
          className={`px-6 py-3 font-semibold ${
            location.pathname === '/admin/analytics'
              ? 'border-b-2 border-yellow-400 text-yellow-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Analytics
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
