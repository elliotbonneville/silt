/**
 * Command input - text input for sending commands
 */

import { type KeyboardEvent, useState } from 'react';

interface CommandInputProps {
  value: string;
  onChange: (value: string) => void;
  onCommand: (command: string) => void;
  disabled?: boolean;
  lineWidth?: number;
  fontSize?: number;
  contentWidth?: number | undefined;
}

export function CommandInput({
  value,
  onChange,
  onCommand,
  disabled,
  lineWidth = 80,
  fontSize = 14,
  contentWidth,
}: CommandInputProps): JSX.Element {
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (): void => {
    if (!value.trim() || disabled) return;

    onCommand(value);
    setHistory((prev) => [...prev, value]);
    setHistoryIndex(-1);
    // Parent should clear value via onChange, but we trigger onCommand
    // Actually, usually onCommand clears it.
    // We expect parent to clear it.
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
        onChange(history[history.length - 1 - newIndex] || '');
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        onChange(history[history.length - 1 - newIndex] || '');
      } else {
        setHistoryIndex(-1);
        onChange('');
      }
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center gap-3 rounded-t-xl border-l-2 border-r-2 border-t-2 bg-gray-800 px-6 py-4 shadow-2xl backdrop-blur-sm transition-all duration-200 ${
          isFocused ? 'border-green-600' : 'border-gray-600 hover:border-gray-500'
        }`}
        style={{
          width: contentWidth ? `${contentWidth}px` : `${lineWidth}ch`,
          maxWidth: '100%',
          fontSize: `${fontSize}px`,
          background: 'linear-gradient(to bottom, rgba(31, 41, 55, 0.95), rgba(31, 41, 55, 1))',
        }}
      >
        <span className="font-mono text-green-400 opacity-80">&gt;</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          // biome-ignore lint/a11y/noAutofocus: We want to autofocus the input
          autoFocus
          placeholder={
            disabled ? 'Connecting...' : 'Enter command (try: look, go north, say hello)'
          }
          className="flex-1 bg-transparent font-mono text-green-400 outline-none placeholder:text-gray-500 disabled:opacity-50 transition-colors duration-200"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </div>
    </div>
  );
}
