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
          <EventLine event={event} currentCharacterId={currentCharacterId} />
        </div>
      ))}
    </div>
  );
}

/**
 * Format event content to use first-person ("You") or third-person based on actor
 */
function formatEventContent(event: GameEvent, isCurrentPlayer: boolean): string {
  const content = event.content || '';

  // If no data or not current player, use default content
  if (!isCurrentPlayer || !event.data) {
    return content;
  }

  const data = event.data;
  const actorName = data['actorName'];
  if (typeof actorName !== 'string') {
    return content;
  }

  // Convert third-person to second-person for different event types
  switch (event.type) {
    case 'item_pickup': {
      const itemName = data['itemName'];
      return typeof itemName === 'string' ? `You take ${itemName}.` : content;
    }

    case 'item_drop': {
      const itemName = data['itemName'];
      return typeof itemName === 'string' ? `You drop ${itemName}.` : content;
    }

    case 'speech': {
      const message = data['message'];
      return typeof message === 'string' ? `You say: "${message}"` : content;
    }

    case 'shout': {
      const message = data['message'];
      return typeof message === 'string' ? `You shout: "${message}"` : content;
    }

    case 'movement': {
      const direction = data['direction'];
      return typeof direction === 'string' ? `You move ${direction}.` : content;
    }

    case 'combat_hit': {
      const targetName = data['targetName'];
      const damage = data['damage'];
      const targetHp = data['targetHp'];
      const targetMaxHp = data['targetMaxHp'];
      if (
        typeof targetName === 'string' &&
        typeof damage === 'number' &&
        typeof targetHp === 'number' &&
        typeof targetMaxHp === 'number'
      ) {
        return `You attack ${targetName} for ${damage} damage! (${targetHp}/${targetMaxHp} HP)`;
      }
      return content;
    }

    default:
      // For unknown types, do basic replacement
      return content.replace(new RegExp(`^${actorName}`, 'i'), 'You');
  }
}

interface EventLineProps {
  readonly event: GameEvent;
  readonly currentCharacterId: string | undefined;
}

function EventLine({ event, currentCharacterId }: EventLineProps): JSX.Element {
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

  // Check if this event is about the current player
  const actorId = event.data?.['actorId'];
  const isCurrentPlayer = typeof actorId === 'string' && actorId === currentCharacterId;

  // Format content based on perspective
  const formattedContent = formatEventContent(event, isCurrentPlayer);

  // Split multi-line content into separate lines
  const lines = formattedContent.split('\n') || [];

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
