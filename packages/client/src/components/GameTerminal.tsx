/**
 * Game terminal - displays game events in terminal-style interface
 */

import type { FormattingPreferences, GameEvent, InventoryOutput, RoomOutput } from '@silt/shared';
import { FONT_FAMILIES, THEME_PRESETS } from '@silt/shared';
import { useEffect, useRef } from 'react';
import {
  CombatEvent,
  DeathEvent,
  InventoryEvent,
  ItemEvent,
  MovementEvent,
  RoomEvent,
  SpeechEvent,
  SystemEvent,
} from './events/index.js';

interface GameTerminalProps {
  events: readonly GameEvent[];
  currentCharacterId?: string;
  preferences?: FormattingPreferences | undefined;
  onContentWidthChange?: (width: number) => void;
}

export function GameTerminal({
  events,
  currentCharacterId,
  preferences,
  onContentWidthChange,
}: GameTerminalProps): JSX.Element {
  const terminalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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

  // Measure and report content width changes
  useEffect(() => {
    if (!contentRef.current || !onContentWidthChange) return;

    const measureWidth = (): void => {
      if (contentRef.current) {
        const width = contentRef.current.offsetWidth;
        onContentWidthChange(width);
      }
    };

    // Measure immediately
    measureWidth();

    // Measure on window resize
    window.addEventListener('resize', measureWidth);
    return () => window.removeEventListener('resize', measureWidth);
  }, [onContentWidthChange]);

  return (
    <div
      ref={terminalRef}
      className="flex-1 overflow-y-auto p-6 pb-28"
      style={{
        backgroundColor: colors.background,
        color: colors.text,
        fontFamily,
        fontSize: `${fontSize}px`,
        lineHeight: '1.6',
      }}
    >
      <div ref={contentRef} style={{ maxWidth: `${lineWidth}ch`, margin: '0 auto' }}>
        {events.length === 0 && (
          <div style={{ color: colors.ambient, opacity: 0.7 }}>Connecting to game server...</div>
        )}

        {events.map((event, index) => {
          // Skip player_entered events for the current player
          if (
            event.type === 'player_entered' &&
            event.data &&
            typeof event.data === 'object' &&
            'actorId' in event.data &&
            event.data['actorId'] === currentCharacterId
          ) {
            return null;
          }

          const prevEvent = index > 0 ? events[index - 1] : null;
          const needsExtraSpace =
            prevEvent &&
            (event.type === 'room_description' ||
              prevEvent.type === 'room_description' ||
              event.type === 'speech' ||
              event.type === 'shout');

          return (
            <div
              key={event.id}
              className={needsExtraSpace ? 'mt-4 mb-1' : 'mb-1'}
              style={{ opacity: event.type === 'ambient' ? 0.7 : 1 }}
            >
              <EventLine
                event={event}
                currentCharacterId={currentCharacterId}
                structuredData={'structuredData' in event ? event.structuredData : undefined}
                colors={colors}
              />
            </div>
          );
        })}
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

// Type guards
function isRoomOutput(data: unknown): data is RoomOutput {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    data.type === 'room' &&
    'data' in data
  );
}

function isInventoryOutput(data: unknown): data is InventoryOutput {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    data.type === 'inventory' &&
    'data' in data
  );
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

  // Route to structured renderers
  if (
    structuredData &&
    typeof structuredData === 'object' &&
    structuredData !== null &&
    'type' in structuredData
  ) {
    // Room output
    if (
      structuredData.type === 'room' &&
      'data' in structuredData &&
      isRoomOutput(structuredData)
    ) {
      return <RoomEvent roomData={structuredData.data} colors={colors} />;
    }

    // Inventory output
    if (
      structuredData.type === 'inventory' &&
      'data' in structuredData &&
      isInventoryOutput(structuredData)
    ) {
      return (
        <InventoryEvent
          items={structuredData.data.items}
          color={getEventColor()}
          ambientColor={colors.ambient}
        />
      );
    }
  }

  // Route to appropriate event component
  const content = event.content || '';
  const color = getEventColor();

  switch (event.type) {
    case 'speech':
    case 'shout':
      return <SpeechEvent content={content} color={color} />;

    case 'movement':
    case 'player_entered':
    case 'player_left':
      return <MovementEvent content={content} color={color} />;

    case 'combat_hit':
    case 'combat_start':
      return <CombatEvent content={content} color={color} />;

    case 'death':
      return <DeathEvent content={content} color={color} />;

    case 'item_pickup':
    case 'item_drop':
      return <ItemEvent content={content} color={color} />;

    case 'ambient':
      return <SystemEvent content={content} color={color} isAmbient={true} />;

    default:
      return <SystemEvent content={content} color={color} />;
  }
}
