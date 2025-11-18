/**
 * Agent overview tab
 */

import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router';
import type { AIAgent } from './layout.js';

interface AgentContext {
  agent: AIAgent;
}

const serverUrl = import.meta.env.VITE_SERVER_URL;
const SERVER_URL = serverUrl ?? 'http://localhost:3000';

export function AgentOverview(): JSX.Element {
  const { agent } = useOutletContext<AgentContext>();
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(agent.description || '');
  const [saving, setSaving] = useState(false);

  // Update local state when agent changes
  useEffect(() => {
    setDescription(agent.description || '');
  }, [agent.description]);

  async function saveDescription(): Promise<void> {
    setSaving(true);
    try {
      const response = await fetch(`${SERVER_URL}/admin/agents/${agent.id}/character`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });

      if (response.ok) {
        setEditing(false);
        // Force reload to get updates - in a real app we'd update context
        window.location.reload();
      } else {
        console.error('Failed to save description');
      }
    } catch (error) {
      console.error('Failed to save description:', error);
    } finally {
      setSaving(false);
    }
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
    <div className="space-y-6">
      <Section title="Status">
        <InfoRow label="Character ID" value={agent.characterId} />
        <InfoRow label="Agent ID" value={agent.id} />

        <div className="border-t border-gray-800 my-2 pt-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-400">Description:</span>
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-xs text-gray-400 hover:text-gray-300"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveDescription}
                  className="text-xs text-green-400 hover:text-green-300"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm p-2 rounded border border-gray-700 focus:border-cyan-500 focus:outline-none h-24"
              placeholder="Enter character description..."
            />
          ) : (
            <div className="text-sm text-white italic bg-gray-800 p-2 rounded border border-gray-800">
              {agent.description || <span className="text-gray-500">No description set.</span>}
            </div>
          )}
        </div>

        <InfoRow label="Current Room" value={agent.currentRoomId} />
        <InfoRow label="Home Room" value={agent.homeRoomId} />
        <InfoRow label="Max Distance" value={`${agent.maxRoomsFromHome} rooms`} />
        <InfoRow label="Is Alive" value={agent.isAlive ? 'Yes' : 'No'} />
        <InfoRow label="HP" value={`${agent.hp}/${agent.maxHp}`} />
      </Section>

      <Section title="Timestamps">
        <InfoRow label="Last Action" value={formatTimestamp(agent.lastActionAt)} />
        <InfoRow
          label="Spatial Memory Updated"
          value={formatTimestamp(agent.spatialMemoryUpdatedAt)}
        />
        <InfoRow label="Created" value={new Date(agent.createdAt).toLocaleString()} />
        <InfoRow label="Updated" value={new Date(agent.updatedAt).toLocaleString()} />
      </Section>

      <Section title="Statistics">
        <InfoRow label="Relationships" value={Object.keys(agent.relationships).length.toString()} />
        <InfoRow
          label="Conversation Messages"
          value={agent.conversationHistory.length.toString()}
        />
        <InfoRow label="Spatial Memory Length" value={`${agent.spatialMemory.length} chars`} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
      <div className="bg-gray-900 p-4 rounded space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}:</span>
      <span className="text-white font-mono">{value}</span>
    </div>
  );
}

export default AgentOverview;
