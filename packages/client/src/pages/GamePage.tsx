/**
 * Game page - main game interface
 */

import type { Player, RoomState } from '@silt/shared';
import { useState } from 'react';
import { CommandInput } from '../components/CommandInput.js';
import { GameTerminal } from '../components/GameTerminal.js';
import { useSocket } from '../hooks/useSocket.js';

export function GamePage(): JSX.Element {
  const { socket, isConnected, events, error } = useSocket();
  const [player, setPlayer] = useState<Player | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [playerName, setPlayerName] = useState('');

  const handleJoin = (): void => {
    if (!socket || !playerName.trim() || isJoining) return;

    setIsJoining(true);

    socket.emit(
      'player:join',
      { name: playerName.trim() },
      (response: {
        success: boolean;
        player?: Player;
        initialRoom?: RoomState;
        error?: string;
      }) => {
        setIsJoining(false);

        if (response.success && response.player) {
          setPlayer(response.player);
        } else {
          console.error('Failed to join:', response.error);
        }
      },
    );
  };

  const handleCommand = (command: string): void => {
    if (!socket || !player) return;
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

  if (!player) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-8">
          <h1 className="mb-6 text-center text-3xl font-bold text-green-400">Silt MUD</h1>

          <div className="mb-4">
            <label htmlFor="playerName" className="mb-2 block text-sm text-gray-300">
              Enter your name:
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoin();
              }}
              disabled={isJoining}
              placeholder="Your character name"
              className="w-full rounded bg-gray-900 px-4 py-2 font-mono text-green-400 outline-none ring-1 ring-gray-700 focus:ring-green-400 disabled:opacity-50"
            />
          </div>

          <button
            type="button"
            onClick={handleJoin}
            disabled={isJoining || !playerName.trim()}
            className="w-full rounded bg-green-600 px-4 py-2 font-mono font-bold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isJoining ? 'Joining...' : 'Enter Game'}
          </button>
        </div>
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
            Playing as: <span className="text-green-400">{player.name}</span>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && <div className="bg-red-900 px-4 py-2 text-center text-sm text-white">{error}</div>}

      {/* Game terminal */}
      <GameTerminal events={events} />

      {/* Command input */}
      <CommandInput onCommand={handleCommand} disabled={!player} />
    </div>
  );
}
