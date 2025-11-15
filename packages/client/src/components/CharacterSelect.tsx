/**
 * Character selection screen
 * Displays existing characters and allows creating new ones
 */

import type { Character, CharacterListItem } from '@silt/shared';
import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

interface CharacterSelectProps {
  socket: Socket;
  username: string;
  onCharacterSelected: (character: Character) => void;
}

export function CharacterSelect({
  socket,
  username,
  onCharacterSelected,
}: CharacterSelectProps): JSX.Element {
  const [characters, setCharacters] = useState<CharacterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selecting, setSelecting] = useState(false);

  const loadCharacters = useCallback((): void => {
    socket.emit(
      'character:list',
      { username },
      (response: { success: boolean; characters?: CharacterListItem[]; error?: string }) => {
        setLoading(false);
        if (response.success && response.characters) {
          setCharacters(response.characters);
          if (response.characters.length === 0) {
            setShowCreateForm(true);
          }
        } else {
          console.error('Failed to load characters:', response.error);
        }
      },
    );
  }, [socket, username]);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  const handleCreateCharacter = (): void => {
    if (!newCharacterName.trim() || creating) return;

    setCreating(true);
    socket.emit(
      'character:create',
      { username, name: newCharacterName.trim() },
      (response: { success: boolean; character?: Character; error?: string }) => {
        setCreating(false);
        if (response.success && response.character) {
          setNewCharacterName('');
          setShowCreateForm(false);
          loadCharacters();
        } else {
          console.error('Failed to create character:', response.error);
        }
      },
    );
  };

  const handleSelectCharacter = (characterId: string): void => {
    if (selecting) return;

    setSelecting(true);
    socket.emit(
      'character:select',
      { characterId },
      (response: { success: boolean; character?: Character; error?: string }) => {
        setSelecting(false);
        if (response.success && response.character) {
          onCharacterSelected(response.character);
        } else {
          console.error('Failed to select character:', response.error);
        }
      },
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-green-400">
        <div className="text-center">
          <div className="mb-4 text-2xl">Loading characters...</div>
          <div className="animate-pulse">⟳</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-gray-700 bg-gray-800 p-8">
        <h1 className="mb-6 text-center text-3xl font-bold text-green-400">Silt MUD</h1>
        <h2 className="mb-6 text-center text-xl text-gray-300">Select Character</h2>

        {/* Character List */}
        {characters.length > 0 && (
          <div className="mb-6 space-y-2">
            {characters.map((char) => (
              <button
                key={char.id}
                type="button"
                onClick={() => handleSelectCharacter(char.id)}
                disabled={!char.isAlive || selecting}
                className={`w-full rounded border p-4 text-left transition-colors ${
                  char.isAlive
                    ? 'border-gray-600 bg-gray-900 hover:border-green-400 hover:bg-gray-800'
                    : 'border-gray-700 bg-gray-950 opacity-50'
                } disabled:cursor-not-allowed`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-lg font-bold text-green-400">{char.name}</div>
                    <div className="mt-1 text-sm text-gray-400">
                      {char.isAlive ? (
                        <span>
                          HP: {char.hp}/{char.maxHp} • Created:{' '}
                          {new Date(char.createdAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-red-400">
                          💀 DEAD - Died: {new Date(char.diedAt || '').toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {char.isAlive && <div className="text-green-400">{selecting ? '...' : '→'}</div>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Create New Character */}
        {!showCreateForm ? (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="w-full rounded border border-gray-600 bg-gray-900 px-4 py-3 font-mono text-green-400 hover:border-green-400 hover:bg-gray-800"
          >
            + Create New Character
          </button>
        ) : (
          <div className="rounded border border-gray-600 bg-gray-900 p-4">
            <h3 className="mb-4 font-mono text-lg text-green-400">Create New Character</h3>

            <input
              type="text"
              value={newCharacterName}
              onChange={(e) => setNewCharacterName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCharacter();
                if (e.key === 'Escape') setShowCreateForm(false);
              }}
              placeholder="Character name"
              disabled={creating}
              className="mb-4 w-full rounded bg-gray-950 px-4 py-2 font-mono text-green-400 outline-none ring-1 ring-gray-700 focus:ring-green-400 disabled:opacity-50"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreateCharacter}
                disabled={!newCharacterName.trim() || creating}
                className="flex-1 rounded bg-green-600 px-4 py-2 font-mono font-bold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewCharacterName('');
                }}
                disabled={creating}
                className="rounded border border-gray-600 px-4 py-2 font-mono text-gray-400 hover:border-gray-400 hover:text-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* First time player message */}
        {characters.length === 0 && !showCreateForm && (
          <div className="mt-4 text-center text-sm text-gray-400">
            Welcome! Create your first character to begin your adventure.
          </div>
        )}
      </div>
    </div>
  );
}
