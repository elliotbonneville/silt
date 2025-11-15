/**
 * Game page - main game interface
 */

import type { Character } from '@silt/shared';
import { useState } from 'react';
import { CharacterSelect } from '../components/CharacterSelect.js';
import { CommandInput } from '../components/CommandInput.js';
import { GameTerminal } from '../components/GameTerminal.js';
import { UsernamePrompt } from '../components/UsernamePrompt.js';
import { useSocket } from '../hooks/useSocket.js';

export function GamePage(): JSX.Element {
  const { socket, isConnected, events, error } = useSocket();
  const [username, setUsername] = useState<string | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);

  const handleCommand = (command: string): void => {
    if (!socket || !character) return;
    socket.emit('game:command', { command });
  };

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

  // Step 1: Username prompt
  if (!username) {
    return <UsernamePrompt onUsernameSubmitted={setUsername} />;
  }

  // Step 2: Character selection
  if (!character && socket) {
    return (
      <CharacterSelect socket={socket} username={username} onCharacterSelected={setCharacter} />
    );
  }

  // Waiting state
  if (!character) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-green-400">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-800 px-4 py-2">
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-xl font-bold text-green-400">Silt MUD</h1>
          <div className="text-sm text-gray-400">
            Playing as:{' '}
            <span className="text-green-400">
              {character.name} ({character.hp}/{character.maxHp} HP)
            </span>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && <div className="bg-red-900 px-4 py-2 text-center text-sm text-white">{error}</div>}

      {/* Game terminal */}
      <GameTerminal events={events} />

      {/* Command input */}
      <CommandInput onCommand={handleCommand} disabled={!character} />
    </div>
  );
}
