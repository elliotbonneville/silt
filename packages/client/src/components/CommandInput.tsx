/**
 * Command input - text input for sending commands
 */

import { type KeyboardEvent, useState } from 'react';

interface CommandInputProps {
  onCommand: (command: string) => void;
  disabled?: boolean;
}

export function CommandInput({ onCommand, disabled }: CommandInputProps): JSX.Element {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const handleSubmit = (): void => {
    if (!input.trim() || disabled) return;

    onCommand(input);
    setHistory((prev) => [...prev, input]);
    setHistoryIndex(-1);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleSubmit();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;

      const newIndex = historyIndex + 1;
      if (newIndex < history.length) {
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] || '');
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] || '');
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  return (
    <div className="border-t border-gray-700 bg-gray-800 p-4">
      <div className="flex items-center gap-2">
        <span className="font-mono text-green-400">&gt;</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            disabled ? 'Connecting...' : 'Enter command (try: look, go north, say hello)'
          }
          className="flex-1 bg-gray-900 px-3 py-2 font-mono text-sm text-green-400 outline-none placeholder:text-gray-600 disabled:opacity-50"
        />
      </div>
    </div>
  );
}
