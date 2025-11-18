/**
 * Tests for event formatting logic
 */

import type { GameEvent } from '@silt/shared';
import { describe, expect, it } from 'vitest';
import { formatEventContent } from './event-formatter.js';

describe('formatEventContent - movement events', () => {
  const createMovementEvent = (
    actorId: string,
    actorName: string,
    fromRoomId: string,
    toRoomId: string,
    direction: string,
  ): GameEvent => ({
    id: 'test-event',
    type: 'movement',
    timestamp: Date.now(),
    originRoomId: fromRoomId,
    relatedEntities: [],
    visibility: 'room',
    data: {
      actorId,
      actorName,
      fromRoomId,
      toRoomId,
      direction,
    },
  });

  describe('when viewer is the mover', () => {
    it('should show departure message in source room', () => {
      const event = createMovementEvent('player1', 'Alice', 'room1', 'room2', 'north');
      const result = formatEventContent(event, 'player1', 'room1');
      expect(result).toBe('You move north.');
    });

    it('should NOT show arrival message in destination room (output shows room description)', () => {
      const event = createMovementEvent('player1', 'Alice', 'room1', 'room2', 'north');
      const result = formatEventContent(event, 'player1', 'room2');
      expect(result).toBe('');
    });
  });

  describe('when viewer is watching someone else move', () => {
    it('should show departure message to viewers in source room', () => {
      const event = createMovementEvent('player1', 'Alice', 'room1', 'room2', 'north');
      const result = formatEventContent(event, 'player2', 'room1');
      expect(result).toBe('Alice moves north.');
    });

    it('should show arrival message to viewers in destination room', () => {
      const event = createMovementEvent('player1', 'Alice', 'room1', 'room2', 'north');
      const result = formatEventContent(event, 'player2', 'room2');
      expect(result).toBe('Alice arrives from the south.');
    });

    it('should show correct opposite directions', () => {
      const testCases: Array<[string, string]> = [
        ['north', 'south'],
        ['south', 'north'],
        ['east', 'west'],
        ['west', 'east'],
        ['northeast', 'southwest'],
        ['southwest', 'northeast'],
        ['northwest', 'southeast'],
        ['southeast', 'northwest'],
        ['up', 'below'],
        ['down', 'above'],
      ];

      for (const [direction, expectedOpposite] of testCases) {
        const event = createMovementEvent('player1', 'Bob', 'room1', 'room2', direction);
        const result = formatEventContent(event, 'player2', 'room2');
        expect(result).toBe(`Bob arrives from the ${expectedOpposite}.`);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle unknown direction', () => {
      const event = createMovementEvent('player1', 'Alice', 'room1', 'room2', 'portal');
      const result = formatEventContent(event, 'player2', 'room2');
      expect(result).toBe('Alice arrives from somewhere.');
    });

    it('should handle missing viewerRoomId', () => {
      const event = createMovementEvent('player1', 'Alice', 'room1', 'room2', 'north');
      const result = formatEventContent(event, 'player2');
      expect(result).toBe('Alice moves north.');
    });
  });

  describe('omniscient perspective (no viewerActorId)', () => {
    it('should show movement without "You" or arrival/departure context', () => {
      const event = createMovementEvent('player1', 'Alice', 'room1', 'room2', 'north');
      const result = formatEventContent(event);
      expect(result).toBe('Alice moves north');
    });

    it('should work for any direction', () => {
      const event = createMovementEvent('player1', 'Bob', 'room1', 'room2', 'southeast');
      const result = formatEventContent(event);
      expect(result).toBe('Bob moves southeast');
    });
  });
});

describe('formatEventContent - omniscient formatting for other event types', () => {
  it('should format speech events in omniscient mode', () => {
    const event: GameEvent = {
      id: 'test',
      type: 'speech',
      timestamp: Date.now(),
      originRoomId: 'room1',
      relatedEntities: [],
      visibility: 'room',
      data: { actorId: 'player1', actorName: 'Alice', message: 'Hello!' },
    };
    expect(formatEventContent(event)).toBe('Alice says: "Hello!"');
  });

  it('should format combat events in omniscient mode', () => {
    const event: GameEvent = {
      id: 'test',
      type: 'combat_hit',
      timestamp: Date.now(),
      originRoomId: 'room1',
      relatedEntities: [],
      visibility: 'room',
      data: {
        actorId: 'player1',
        actorName: 'Alice',
        targetId: 'player2',
        targetName: 'Bob',
        damage: 15,
        targetHp: 85,
        targetMaxHp: 100,
      },
    };
    expect(formatEventContent(event)).toBe('Alice attacks Bob for 15 damage');
  });

  it('should format death events in omniscient mode', () => {
    const event: GameEvent = {
      id: 'test',
      type: 'death',
      timestamp: Date.now(),
      originRoomId: 'room1',
      relatedEntities: [],
      visibility: 'global',
      data: { victimName: 'Bob', killerName: 'Alice' },
    };
    expect(formatEventContent(event)).toBe('💀 Bob was slain by Alice');
  });
});
