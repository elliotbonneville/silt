/**
 * Game route - main gameplay screen
 */

import type { Character } from '@silt/shared';
import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router';
import type { Socket } from 'socket.io-client';
import { CommandInput } from '../components/CommandInput.js';
import { GameTerminal } from '../components/GameTerminal.js';

interface SocketContext {
  socket: Socket | null;
  isConnected: boolean;
  events: readonly import('@silt/shared').GameEvent[];
  error: string | null;
}

export function GameRoute(): JSX.Element {
  const { socket, events, error } = useOutletContext<SocketContext>();
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!socket || !characterId) return;

    socket.emit(
      'character:select',
      { characterId },
      (response: { success: boolean; character?: Character; error?: string }) => {
        setLoading(false);
        if (response.success && response.character) {
          setCharacter(response.character);
        } else {
          console.error('Failed to select character:', response.error);
          navigate('/');
        }
      },
    );
  }, [socket, characterId, navigate]);

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
