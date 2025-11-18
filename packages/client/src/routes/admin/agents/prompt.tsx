/**
 * Agent system prompt tab - editable
 */

import { useState } from 'react';
import { useOutletContext } from 'react-router';
import type { AIAgent } from './layout.js';

interface AgentContext {
  agent: AIAgent;
}

const serverUrl = import.meta.env.VITE_SERVER_URL;
const SERVER_URL = serverUrl ?? 'http://localhost:3000';

export function AgentPrompt(): JSX.Element {
  const { agent } = useOutletContext<AgentContext>();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(): Promise<void> {
    setSaving(true);
    try {
      const response = await fetch(`${SERVER_URL}/admin/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: value }),
      });
      if (response.ok) {
        setEditing(false);
        window.location.reload(); // Reload to get updated agent data
      }
    } catch (error) {
      console.error('Failed to save system prompt:', error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">System Prompt</h3>
        {!editing ? (
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setValue(agent.systemPrompt);
            }}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm font-medium"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
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
          </div>
        )}
      </div>
      {editing ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full h-96 bg-gray-900 p-4 rounded text-sm text-gray-300 font-mono border border-gray-700 focus:border-cyan-500 focus:outline-none"
        />
      ) : (
        <pre className="bg-gray-900 p-4 rounded text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">
          {agent.systemPrompt}
        </pre>
      )}
    </div>
  );
}

export default AgentPrompt;
