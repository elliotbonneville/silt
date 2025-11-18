/**
 * Agent spatial memory tab - editable and regenerable
 */

import { useState } from 'react';
import { useOutletContext } from 'react-router';
import type { AIAgent } from './layout.js';

interface AgentContext {
  agent: AIAgent;
}

const serverUrl = import.meta.env.VITE_SERVER_URL;
const SERVER_URL = serverUrl ?? 'http://localhost:3000';

export function AgentSpatial(): JSX.Element {
  const { agent } = useOutletContext<AgentContext>();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

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

  async function save(): Promise<void> {
    setSaving(true);
    try {
      const response = await fetch(`${SERVER_URL}/admin/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spatialMemory: value }),
      });
      if (response.ok) {
        setEditing(false);
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to save spatial memory:', error);
    } finally {
      setSaving(false);
    }
  }

  async function regenerate(): Promise<void> {
    if (!confirm('Regenerate spatial memory? This will take 10-30 seconds.')) return;
    setSaving(true);
    try {
      const response = await fetch(
        `${SERVER_URL}/admin/agents/${agent.id}/regenerate-spatial-memory`,
        { method: 'POST' },
      );
      if (response.ok) {
        alert('Spatial memory regeneration triggered. Check back in 30 seconds.');
      }
    } catch (error) {
      console.error('Failed to regenerate spatial memory:', error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Spatial Memory (Mental Map)</h3>
        <div className="flex gap-2">
          {!editing && (
            <button
              type="button"
              onClick={regenerate}
              disabled={saving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              🔄 Regenerate
            </button>
          )}
          {agent.spatialMemory && !editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setValue(agent.spatialMemory);
              }}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm font-medium"
            >
              Edit
            </button>
          )}
          {editing && (
            <>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
      {agent.spatialMemory ? (
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            Last updated: {formatTimestamp(agent.spatialMemoryUpdatedAt)}
          </div>
          {editing ? (
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full h-64 bg-gray-900 p-4 rounded text-sm text-gray-300 font-mono border border-gray-700 focus:border-cyan-500 focus:outline-none"
            />
          ) : (
            <pre className="bg-gray-900 p-4 rounded text-sm text-gray-300 whitespace-pre-wrap">
              {agent.spatialMemory}
            </pre>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 p-4 rounded text-gray-500 italic">
          No spatial memory generated yet. Click Regenerate to create it.
        </div>
      )}
    </div>
  );
}

export default AgentSpatial;
