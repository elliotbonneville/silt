/**
 * Spawn Agent Modal - form to create a new AI agent
 */

import { useState } from 'react';

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

      // Reset form
      setName('');
      setSystemPrompt('');
      setHomeRoomId('');
      setCurrentRoomId('');
      setMaxRoomsFromHome(2);
      setHp(100);
      setMaxHp(100);
      setAttackPower(10);
      setDefense(5);

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

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="agent-name" className="block text-sm font-medium text-gray-300 mb-1">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              id="agent-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={50}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
              placeholder="Agent name"
            />
          </div>

          {/* System Prompt */}
          <div>
            <label
              htmlFor="agent-system-prompt"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              System Prompt (Personality & Backstory) <span className="text-red-400">*</span>
            </label>
            <textarea
              id="agent-system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              required
              minLength={10}
              rows={4}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
              placeholder="Describe the agent's personality, goals, and backstory..."
            />
          </div>

          {/* Rooms */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="agent-home-room"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Home Room <span className="text-red-400">*</span>
              </label>
              <select
                id="agent-home-room"
                value={homeRoomId}
                onChange={(e) => setHomeRoomId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">Select room...</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="agent-current-room"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Current Room <span className="text-red-400">*</span>
              </label>
              <select
                id="agent-current-room"
                value={currentRoomId}
                onChange={(e) => setCurrentRoomId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">Select room...</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Max Rooms From Home */}
          <div>
            <label
              htmlFor="agent-max-rooms"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Max Rooms From Home: {maxRoomsFromHome}
            </label>
            <input
              id="agent-max-rooms"
              type="range"
              min="0"
              max="10"
              value={maxRoomsFromHome}
              onChange={(e) => setMaxRoomsFromHome(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="agent-hp" className="block text-sm font-medium text-gray-300 mb-1">
                HP
              </label>
              <input
                id="agent-hp"
                type="number"
                min="1"
                max="500"
                value={hp}
                onChange={(e) => setHp(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label
                htmlFor="agent-max-hp"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Max HP
              </label>
              <input
                id="agent-max-hp"
                type="number"
                min="1"
                max="500"
                value={maxHp}
                onChange={(e) => setMaxHp(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label
                htmlFor="agent-attack"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Attack Power
              </label>
              <input
                id="agent-attack"
                type="number"
                min="1"
                max="100"
                value={attackPower}
                onChange={(e) => setAttackPower(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label
                htmlFor="agent-defense"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Defense
              </label>
              <input
                id="agent-defense"
                type="number"
                min="0"
                max="100"
                value={defense}
                onChange={(e) => setDefense(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Spawn Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
