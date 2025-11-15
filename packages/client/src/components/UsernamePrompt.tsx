/**
 * Username prompt - account identification screen
 * For Iteration 1, this is a simple username input (no password)
 */

import { useState } from 'react';

interface UsernamePromptProps {
  onUsernameSubmitted: (username: string) => void;
}

export function UsernamePrompt({ onUsernameSubmitted }: UsernamePromptProps): JSX.Element {
  const [username, setUsername] = useState('');

  const handleSubmit = (): void => {
    if (!username.trim()) return;
    onUsernameSubmitted(username.trim());
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-8">
        <h1 className="mb-6 text-center text-3xl font-bold text-green-400">Silt MUD</h1>
        <p className="mb-6 text-center text-sm text-gray-400">
          A text-based multiplayer adventure with AI companions
        </p>

        <div className="mb-4">
          <label htmlFor="username" className="mb-2 block text-sm text-gray-300">
            Enter your username:
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="Your username"
            className="w-full rounded bg-gray-900 px-4 py-2 font-mono text-green-400 outline-none ring-1 ring-gray-700 focus:ring-green-400"
          />
          <p className="mt-2 text-xs text-gray-500">
            Note: No password required for now. Your characters are saved by username.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!username.trim()}
          className="w-full rounded bg-green-600 px-4 py-2 font-mono font-bold text-white hover:bg-green-700 disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
