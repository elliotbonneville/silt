/**
 * Game terminal - displays game events in terminal-style interface
 */

import type { FormattingPreferences, GameEvent } from '@silt/shared';
import { FONT_FAMILIES, THEME_PRESETS } from '@silt/shared';
import { useEffect, useRef } from 'react';

interface GameTerminalProps {
  events: readonly GameEvent[];
  currentCharacterId?: string;
  preferences?: FormattingPreferences | undefined;
}

export function GameTerminal({
  events,
  currentCharacterId,
  preferences,
}: GameTerminalProps): JSX.Element {
  const terminalRef = useRef<HTMLDivElement>(null);

  // Get theme colors, with fallback to classic
  const theme = preferences ? THEME_PRESETS[preferences.themePreset] : THEME_PRESETS.classic;
  const fontFamily = preferences
    ? FONT_FAMILIES[preferences.fontFamily].family
    : FONT_FAMILIES['courier-new'].family;
  const fontSize = preferences?.fontSize ?? 14;
  const lineWidth = preferences?.lineWidth ?? 80;

  // Merge custom colors if present
  const colors = {
    ...theme,
    ...(preferences?.customColors
      ? Object.fromEntries(
          Object.entries(preferences.customColors).filter(([_, v]) => v !== undefined),
        )
      : {}),
  };

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
      className="flex-1 overflow-y-auto p-4"
      style={{
        backgroundColor: colors.background,
        color: colors.text,
        fontFamily,
        fontSize: `${fontSize}px`,
      }}
    >
      <div style={{ maxWidth: `${lineWidth}ch`, margin: '0 auto' }}>
        {events.length === 0 && (
          <div style={{ color: colors.ambient }}>Connecting to game server...</div>
        )}

        {events.map((event) => (
          <div key={event.id} className="mb-2">
            <EventLine
              event={event}
              currentCharacterId={currentCharacterId}
              structuredData={'structuredData' in event ? event.structuredData : undefined}
              colors={colors}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface EventLineProps {
  readonly event: GameEvent;
  readonly currentCharacterId: string | undefined;
  readonly structuredData?: unknown; // For structured output rendering
  readonly colors: {
    text: string;
    roomDescription: string;
    movement: string;
    speech: string;
    combat: string;
    death: string;
    item: string;
    ambient: string;
    system: string;
  };
}

function EventLine({ event, structuredData, colors }: EventLineProps): JSX.Element {
  const getEventColor = (): string => {
    switch (event.type) {
      case 'room_description':
        return colors.roomDescription;
      case 'movement':
      case 'player_entered':
      case 'player_left':
        return colors.movement;
      case 'speech':
      case 'shout':
        return colors.speech;
      case 'ambient':
        return colors.ambient;
      case 'combat_hit':
      case 'combat_start':
        return colors.combat;
      case 'death':
        return colors.death;
      case 'item_pickup':
      case 'item_drop':
        return colors.item;
      default:
        return colors.system;
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
        return <div style={{ color: colors.ambient }}>Inventory is empty.</div>;
      }

      return (
        <div style={{ color: getEventColor() }}>
          <div className="font-bold mb-1">Inventory:</div>
          {items.map((item: { id: string; name: string; isEquipped: boolean }) => (
            <div key={item.id} style={{ color: colors.ambient }}>
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

  const color = getEventColor();

  // For room descriptions, make the first line (room name) bold
  if (event.type === 'room_description' && lines.length > 0) {
    return (
      <div style={{ color }}>
        <div className="font-bold">{lines[0]}</div>
        {lines.slice(1).map((line, idx) => (
          <div key={`${event.id}-${idx + 1}`}>{line || '\u00A0'}</div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ color }}>
      {lines.map((line, idx) => (
        <div key={`${event.id}-${idx}`}>{line || '\u00A0'}</div>
      ))}
    </div>
  );
}
