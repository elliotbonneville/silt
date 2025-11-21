/**
 * Spawn Agent Modal - form to create a new AI agent
 */

import { useState } from 'react';
import { AgentFormFields } from './AgentFormFields.js';
import { AGENT_TEMPLATES, type AgentTemplate } from './agent-templates.js';

const serverUrl = import.meta.env.VITE_SERVER_URL;
const SERVER_URL = serverUrl ?? 'http://localhost:3000';

interface SpawnAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rooms: Array<{ id: string; name: string }>;
}

export function SpawnAgentModal({
  isOpen,
  onClose,
  onSuccess,
  rooms,
}: SpawnAgentModalProps): JSX.Element | null {
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [description, setDescription] = useState('');
  const [homeRoomId, setHomeRoomId] = useState('');
  const [currentRoomId, setCurrentRoomId] = useState('');
  const [maxRoomsFromHome, setMaxRoomsFromHome] = useState(2);
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [attackPower, setAttackPower] = useState(10);
  const [defense, setDefense] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const applyTemplate = (template: AgentTemplate) => {
    setName(template.name);
    setDescription(template.description);
    setSystemPrompt(template.systemPrompt);
    setHp(template.hp);
    setMaxHp(template.hp);
    setAttackPower(template.attackPower);
    setDefense(template.defense);
    setMaxRoomsFromHome(template.maxRoomsFromHome);
  };

  const resetForm = () => {
    setName('');
    setSystemPrompt('');
    setDescription('');
    setHomeRoomId('');
    setCurrentRoomId('');
    setMaxRoomsFromHome(2);
    setHp(100);
    setMaxHp(100);
    setAttackPower(10);
    setDefense(5);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${SERVER_URL}/admin/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          systemPrompt,
          homeRoomId,
          currentRoomId,
          maxRoomsFromHome,
          hp,
          maxHp,
          attackPower,
          defense,
        }),
      });

      if (!response.ok) {
        const data: unknown = await response.json();
        const errorMsg =
          typeof data === 'object' &&
          data !== null &&
          'error' in data &&
          typeof data.error === 'string'
            ? data.error
            : 'Failed to create agent';
        throw new Error(errorMsg);
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Spawn New AI Agent</h2>

        {/* Templates Section */}
        <div className="mb-6">
          <span className="block text-sm font-medium text-gray-300 mb-2">Quick Templates</span>
          <div className="flex gap-2 flex-wrap">
            {AGENT_TEMPLATES.map((template) => (
              <button
                key={template.name}
                type="button"
                onClick={() => applyTemplate(template)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-xs text-cyan-300 border border-gray-600 rounded transition-colors"
                title={template.description}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-600 rounded text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <AgentFormFields
            name={name}
            setName={setName}
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            description={description}
            setDescription={setDescription}
            homeRoomId={homeRoomId}
            setHomeRoomId={setHomeRoomId}
            currentRoomId={currentRoomId}
            setCurrentRoomId={setCurrentRoomId}
            maxRoomsFromHome={maxRoomsFromHome}
            setMaxRoomsFromHome={setMaxRoomsFromHome}
            hp={hp}
            setHp={setHp}
            maxHp={maxHp}
            setMaxHp={setMaxHp}
            attackPower={attackPower}
            setAttackPower={setAttackPower}
            defense={defense}
            setDefense={setDefense}
            rooms={rooms}
          />

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white font-medium rounded transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Agent'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
