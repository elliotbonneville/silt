/**
 * Admin agents layout - sidebar with agent list and outlet for tab content
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router';
import { SpawnAgentModal } from '../../../components/admin/SpawnAgentModal.js';

const serverUrl = import.meta.env.VITE_SERVER_URL;
const SERVER_URL = serverUrl ?? 'http://localhost:3000';

export interface AIAgent {
  id: string;
  characterId: string;
  characterName: string;
  description?: string;
  currentRoomId: string;
  isAlive: boolean;
  hp: number;
  maxHp: number;
  homeRoomId: string;
  maxRoomsFromHome: number;
  systemPrompt: string;
  spatialMemory: string;
  spatialMemoryUpdatedAt: string;
  relationships: Record<string, unknown>;
  conversationHistory: Array<{ speaker: string; message: string; timestamp: number }>;
  lastActionAt: string;
  createdAt: string;
  updatedAt: string;
}

export function AgentsLayout(): JSX.Element {
  const params = useParams<{ agentId?: string }>();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSpawnModalOpen, setIsSpawnModalOpen] = useState(false);
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([]);

  const selectedAgentId = params.agentId;

  // Filter agents by search query
  const filteredAgents = agents.filter(
    (agent) =>
      agent.characterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.currentRoomId.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const loadAgents = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${SERVER_URL}/admin/agents`);
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRooms = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${SERVER_URL}/admin/map`);
      const data = await response.json();
      const roomList = (data.rooms || []).map((r: { id: string; name: string }) => ({
        id: r.id,
        name: r.name,
      }));
      setRooms(roomList);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  }, []);

  useEffect(() => {
    loadAgents();
    loadRooms();
    const interval = setInterval(() => {
      loadAgents();
    }, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [loadAgents, loadRooms]);

  function formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    const now = Date.now();
    const diff = now - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-400">Loading agents...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Agent search sidebar */}
      <div className="w-80 border-r border-gray-700 bg-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-cyan-400">
              AI Agents ({filteredAgents.length}/{agents.length})
            </h2>
            <button
              type="button"
              onClick={() => setIsSpawnModalOpen(true)}
              className="px-3 py-1 bg-cyan-600 text-white text-sm rounded hover:bg-cyan-700 transition-colors"
              title="Spawn new AI agent"
            >
              + Spawn
            </button>
          </div>
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-700">
          {filteredAgents.length > 0 ? (
            filteredAgents.map((agent) => (
              <Link
                key={agent.id}
                to={`/admin/agents/${agent.id}/overview`}
                className={`block w-full p-4 text-left transition-colors ${
                  selectedAgentId === agent.id
                    ? 'bg-gray-700 border-l-4 border-cyan-400'
                    : 'hover:bg-gray-750'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-white">{agent.characterName}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${agent.isAlive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}
                  >
                    {agent.isAlive ? 'ALIVE' : 'DEAD'}
                  </span>
                </div>
                <div className="text-sm text-gray-400 space-y-1">
                  <div>🏠 {agent.homeRoomId}</div>
                  <div>📍 {agent.currentRoomId}</div>
                  <div className="text-xs text-gray-500">
                    Last action: {formatTimestamp(agent.lastActionAt)}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">No agents found</div>
          )}
        </div>
      </div>

      {/* Tab content area */}
      {selectedAgentId ? (
        <Outlet context={{ agents, loadAgents }} />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-6xl mb-4">🤖</div>
            <div className="text-lg">Select an AI agent to view details</div>
          </div>
        </div>
      )}

      {/* Spawn Agent Modal */}
      <SpawnAgentModal
        isOpen={isSpawnModalOpen}
        onClose={() => setIsSpawnModalOpen(false)}
        onSuccess={() => void loadAgents()}
        rooms={rooms}
      />
    </div>
  );
}

export default AgentsLayout;
