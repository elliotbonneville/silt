/**
 * Individual agent layout - shows agent header and tab navigation
 */

import { Link, Outlet, useOutletContext, useParams } from 'react-router';
import type { AIAgent } from './layout.js';

interface AgentsContext {
  agents: AIAgent[];
  loadAgents: () => Promise<void>;
}

export function AgentLayout(): JSX.Element {
  const params = useParams<{ agentId: string }>();
  const { agents } = useOutletContext<AgentsContext>();
  const agentId = params.agentId;
  const agent = agents.find((a) => a.id === agentId);

  if (!agent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-lg">Agent not found</div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-700 bg-gray-800">
        <h1 className="text-2xl font-bold text-cyan-400 mb-2">{agent.characterName}</h1>
        <div className="flex gap-4 text-sm text-gray-400">
          <span>
            HP: {agent.hp}/{agent.maxHp}
          </span>
          <span>•</span>
          <span>Range: {agent.maxRoomsFromHome} rooms</span>
          <span>•</span>
          <span>Updated: {formatTimestamp(agent.updatedAt)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 bg-gray-800">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'prompt', label: 'System Prompt', icon: '📝' },
          { id: 'spatial', label: 'Spatial Memory', icon: '🗺️' },
          { id: 'relationships', label: 'Relationships', icon: '👥' },
          { id: 'conversation', label: 'Conversation', icon: '💬' },
        ].map((tab) => {
          const currentPath = window.location.pathname;
          const isActive = currentPath.endsWith(`/${tab.id}`);

          return (
            <Link
              key={tab.id}
              to={`/admin/agents/${agentId}/${tab.id}`}
              className={`px-4 py-3 font-medium text-sm ${
                isActive
                  ? 'border-b-2 border-cyan-400 text-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Outlet context={{ agent }} />
      </div>
    </div>
  );
}

export default AgentLayout;
