/**
 * Game terminal - displays game events in terminal-style interface
 */

import type { GameEvent } from '@silt/shared';
import { useEffect, useRef } from 'react';

interface GameTerminalProps {
  events: readonly GameEvent[];
  currentCharacterId?: string;
}

export function GameTerminal({ events, currentCharacterId }: GameTerminalProps): JSX.Element {
  const terminalRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when events change
  // biome-ignore lint/correctness/useExhaustiveDependencies: We want to scroll whenever events array changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div
      ref={terminalRef}
      className="flex-1 overflow-y-auto bg-gray-900 p-4 font-mono text-sm text-green-400"
    >
      {events.length === 0 && <div className="text-gray-500">Connecting to game server...</div>}

      {events.map((event) => (
        <div key={event.id} className="mb-2">
          <EventLine
            event={event}
            currentCharacterId={currentCharacterId}
            structuredData={'structuredData' in event ? event.structuredData : undefined}
          />
        </div>
      ))}
    </div>
  );
}

interface EventLineProps {
  readonly event: GameEvent;
  readonly currentCharacterId: string | undefined;
  readonly structuredData?: unknown; // For structured output rendering
}

function EventLine({ event, structuredData }: EventLineProps): JSX.Element {
  const getEventColor = (): string => {
    switch (event.type) {
      case 'room_description':
        return 'text-cyan-400';
      case 'movement':
      case 'player_entered':
      case 'player_left':
        return 'text-yellow-400';
      case 'speech':
      case 'shout':
        return 'text-white';
      case 'ambient':
        return 'text-gray-400';
      case 'combat_hit':
      case 'combat_start':
        return 'text-red-400';
      case 'death':
        return 'text-red-600 font-bold';
      case 'item_pickup':
      case 'item_drop':
        return 'text-blue-400';
      default:
        return 'text-green-400';
    }
  };

  // Check if this is structured inventory output
  if (
    structuredData &&
    typeof structuredData === 'object' &&
    structuredData !== null &&
    'type' in structuredData &&
    'data' in structuredData
  ) {
    const output = structuredData;

    if (
      output.type === 'inventory' &&
      output.data &&
      typeof output.data === 'object' &&
      output.data !== null &&
      'items' in output.data &&
      Array.isArray(output.data.items)
    ) {
      const items = output.data.items;

      if (items.length === 0) {
        return <div className="text-gray-500">Inventory is empty.</div>;
      }

      return (
        <div className={getEventColor()}>
          <div className="font-bold mb-1">Inventory:</div>
          {items.map((item: { id: string; name: string; isEquipped: boolean }) => (
            <div key={item.id} className="text-gray-400">
              - {item.name}
              {item.isEquipped ? ' (equipped)' : ''}
            </div>
          ))}
        </div>
      );
    }
  }

  // Content is already formatted by the server
  const content = event.content || '';

  // Split multi-line content into separate lines
  const lines = content.split('\n') || [];

  // For room descriptions, make the first line (room name) bold
  if (event.type === 'room_description' && lines.length > 0) {
    return (
      <div className={getEventColor()}>
        <div className="font-bold">{lines[0]}</div>
        {lines.slice(1).map((line, idx) => (
          <div key={`${event.id}-${idx + 1}`}>{line || '\u00A0'}</div>
        ))}
      </div>
    );
  }

  return (
    <div className={getEventColor()}>
      {lines.map((line, idx) => (
        <div key={`${event.id}-${idx}`}>{line || '\u00A0'}</div>
      ))}
    </div>
  );
}
