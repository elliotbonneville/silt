/**
 * Character selection route - client-side data loading
 */

import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { CharacterListItem } from '../api/client.js';
import * as api from '../api/client.js';

export default function CharactersRoute(): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const username = searchParams.get('username');

  const [characters, setCharacters] = useState<CharacterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Store username in localStorage and redirect if no username
  useEffect(() => {
    if (!username) {
      navigate('/');
    } else {
      localStorage.setItem('username', username);
    }
  }, [username, navigate]);

  // Load characters
  useEffect(() => {
    if (!username) return;

    setLoading(true);
    api
      .listCharacters(username)
      .then((chars) => {
        setCharacters(chars);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load characters');
        setLoading(false);
      });
  }, [username]);

  const handleCreateCharacter = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!username) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name');

    if (!name || typeof name !== 'string' || !name.trim()) {
      setError('Character name is required');
      return;
    }

    try {
      setError(null);
      await api.createCharacter(username, name.trim());
      // Reload characters
      const chars = await api.listCharacters(username);
      setCharacters(chars);
      // Clear form
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create character');
    }
  };

  const handleSelectCharacter = (characterId: string): void => {
    navigate(`/game/${characterId}`);
  };

  const handleRetireCharacter = async (
    characterId: string,
    characterName: string,
  ): Promise<void> => {
    if (!confirm(`Are you sure you want to retire ${characterName}? This cannot be undone.`)) {
      return;
    }

    try {
      setError(null);
      await api.retireCharacter(characterId);
      // Reload characters
      if (username) {
        const chars = await api.listCharacters(username);
        setCharacters(chars);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retire character');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-green-400">
        Loading characters...
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-gray-700 bg-gray-800 p-8">
        <h1 className="mb-6 text-center text-3xl font-bold text-green-400">Silt</h1>
        <h2 className="mb-6 text-center text-xl text-gray-300">Select Character</h2>

        {error && <div className="mb-4 rounded bg-red-900 p-3 text-sm text-white">{error}</div>}

        {/* Character List */}
        {characters.length > 0 && (
          <div className="mb-6 space-y-2">
            {characters.map((char) => (
              <div
                key={char.id}
                className={`flex items-stretch gap-2 rounded border transition-colors ${
                  char.isAlive ? 'border-gray-600' : 'border-gray-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelectCharacter(char.id)}
                  disabled={!char.isAlive}
                  className={`flex-1 rounded-l p-4 text-left transition-colors ${
                    char.isAlive
                      ? 'bg-gray-900 hover:border-green-400 hover:bg-gray-800'
                      : 'bg-gray-950 opacity-50'
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
                    {char.isAlive && <div className="text-green-400">→</div>}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRetireCharacter(char.id, char.name);
                  }}
                  className="rounded-r bg-red-900 px-4 text-sm text-red-300 hover:bg-red-800 hover:text-red-100"
                  title="Retire character"
                >
                  Retire
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Create New Character Form */}
        <details className="rounded border border-gray-600 bg-gray-900">
          <summary className="cursor-pointer px-4 py-3 font-mono text-green-400 hover:bg-gray-800">
            + Create New Character
          </summary>
          <form onSubmit={handleCreateCharacter} className="space-y-4 p-4">
            <div>
              <input
                name="name"
                type="text"
                placeholder="Character name"
                required
                className="w-full rounded bg-gray-950 px-4 py-2 font-mono text-green-400 outline-none ring-1 ring-gray-700 focus:ring-green-400"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded bg-green-600 px-4 py-2 font-mono font-bold text-white hover:bg-green-700"
              >
                Create
              </button>
            </div>
          </form>
        </details>

        {/* First time player message */}
        {characters.length === 0 && (
          <div className="mt-4 text-center text-sm text-gray-400">
            Welcome! Create your first character to begin your adventure.
          </div>
        )}

        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 w-full rounded border border-gray-600 px-4 py-2 font-mono text-gray-400 hover:border-gray-400 hover:text-gray-300"
        >
          ← Change Username
        </button>
      </div>
    </div>
  );
}
