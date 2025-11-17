/**
 * Game route - main gameplay screen
 * Only route that connects to WebSocket
 */

import type { CharacterResponse, FormattingPreferences } from '@silt/shared';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { getPreferences, updatePreferences } from '../api/client.js';
import { CommandInput } from '../components/CommandInput.js';
import { GameTerminal } from '../components/GameTerminal.js';
import { SettingsModal } from '../components/SettingsModal.js';
import { useSocket } from '../hooks/useSocket.js';

export default function GameRoute(): JSX.Element {
  const { socket, events, error, isConnected } = useSocket();
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<CharacterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<FormattingPreferences | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contentWidth, setContentWidth] = useState<number | undefined>(undefined);

  // Load preferences from username in localStorage
  useEffect(() => {
    const username = localStorage.getItem('username');
    if (username) {
      getPreferences(username)
        .then(setPreferences)
        .catch((err) => {
          console.error('Failed to load preferences:', err);
          // Set default preferences if loading fails
          setPreferences({
            themePreset: 'classic',
            fontFamily: 'courier-new',
            fontSize: 14,
            lineWidth: 80,
          });
        });
    } else {
      // Set default preferences if no username
      setPreferences({
        themePreset: 'classic',
        fontFamily: 'courier-new',
        fontSize: 14,
        lineWidth: 80,
      });
    }
  }, []);

  // Connect to character when socket is ready
  useEffect(() => {
    if (!socket || !characterId || !isConnected) return;

    socket.emit(
      'character:select',
      { characterId },
      (response: { success: boolean; character?: CharacterResponse; error?: string }) => {
        setLoading(false);
        if (response.success && response.character) {
          setCharacter(response.character);
        } else {
          navigate('/');
        }
      },
    );

    // Listen for character stat updates
    const handleCharacterUpdate = (updated: Partial<CharacterResponse>) => {
      setCharacter((prev) => (prev ? { ...prev, ...updated } : prev));
    };

    socket.on('character:update', handleCharacterUpdate);

    return () => {
      socket.off('character:update', handleCharacterUpdate);
    };
  }, [socket, characterId, navigate, isConnected]);

  const handleSavePreferences = async (newPrefs: Partial<FormattingPreferences>): Promise<void> => {
    const username = localStorage.getItem('username');
    if (!username) {
      throw new Error('Username not found. Please log out and log back in.');
    }

    const updated = await updatePreferences(username, newPrefs);
    setPreferences(updated);
  };

  // Wait for socket connection
  if (!isConnected) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-green-400">
        <div className="text-center">
          <div className="mb-4 text-2xl">Connecting to server...</div>
          <div className="animate-pulse">⟳</div>
        </div>
      </div>
    );
  }

  const handleCommand = (command: string): void => {
    if (!socket) return;
    socket.emit('game:command', { command });
  };

  if (loading || !character) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-green-400">
        <div className="text-center">Loading character...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-800 px-4 py-2">
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-xl font-bold text-green-400">Silt</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">
              Playing as:{' '}
              <span className="text-green-400">
                {character.name} ({character.hp}/{character.maxHp} HP)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="rounded bg-gray-700 px-3 py-1 text-sm text-gray-300 hover:bg-gray-600"
              aria-label="Open settings"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && <div className="bg-red-900 px-4 py-2 text-center text-sm text-white">{error}</div>}

      {/* Game terminal */}
      <GameTerminal
        events={events}
        currentCharacterId={character.id}
        preferences={preferences ?? undefined}
        onContentWidthChange={setContentWidth}
      />

      {/* Command input - fixed at bottom */}
      <CommandInput
        onCommand={handleCommand}
        disabled={!character}
        lineWidth={preferences?.lineWidth ?? 80}
        fontSize={preferences?.fontSize ?? 14}
        contentWidth={contentWidth}
      />

      {/* Settings modal */}
      {preferences && (
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          preferences={preferences}
          onSave={handleSavePreferences}
        />
      )}
    </div>
  );
}
