/**
 * Username entry route - simple client-side form
 */

import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';

export default function UsernameRoute(): JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = formData.get('username');

    if (!username || typeof username !== 'string' || !username.trim()) {
      setError('Username is required');
      return;
    }

    // Navigate to character selection with username in URL
    navigate(`/characters?username=${encodeURIComponent(username.trim())}`);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-8">
        <h1 className="mb-6 text-center text-3xl font-bold text-green-400">Silt</h1>
        <p className="mb-6 text-center text-sm text-gray-400">
          A text-based multiplayer adventure with AI companions
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-2 block text-sm text-gray-300">
              Enter your username:
            </label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Your username"
              required
              className="w-full rounded bg-gray-900 px-4 py-2 font-mono text-green-400 outline-none ring-1 ring-gray-700 focus:ring-green-400"
            />
            <p className="mt-2 text-xs text-gray-500">
              No password required. Your characters are saved by username.
            </p>
          </div>

          {error && <div className="rounded bg-red-900 p-3 text-sm text-white">{error}</div>}

          <button
            type="submit"
            className="w-full rounded bg-green-600 px-4 py-2 font-mono font-bold text-white hover:bg-green-700"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
