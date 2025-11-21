import type { GameEvent } from '@silt/shared';
import { describe, expect, it } from 'vitest';
import { formatEventContent } from '../../event-formatter.js';

describe('formatEventContent', () => {
  describe('tell events', () => {
    const event: GameEvent = {
      id: 'evt-1',
      type: 'tell',
      timestamp: Date.now(),
      originRoomId: 'room-1',
      visibility: 'room',
      relatedEntities: [],
      data: {
        actorId: 'sender-id',
        actorName: 'Sender',
        targetId: 'target-id',
        targetName: 'Target',
        message: 'Secret Message',
      },
    };

    it('should show full message to sender', () => {
      const text = formatEventContent(event, 'sender-id');
      expect(text).toBe('You say to Target: "Secret Message"');
    });

    it('should show full message to target', () => {
      const text = formatEventContent(event, 'target-id');
      expect(text).toBe('Sender says to you: "Secret Message"');
    });

    it('should obfuscate message to observer', () => {
      const text = formatEventContent(event, 'observer-id');
      expect(text).toBe('Sender says something to Target.');
    });

    it('should show full message if observer is listening', () => {
      // Pass isListening = true
      const text = formatEventContent(event, 'observer-id', undefined, true);
      expect(text).toBe('Sender says to Target: "Secret Message"');
    });

    it('should show omniscient view if no viewer', () => {
      const text = formatEventContent(event);
      expect(text).toBe('Sender tells Target: "Secret Message"');
    });
  });

  describe('whisper events', () => {
    const event: GameEvent = {
      id: 'evt-2',
      type: 'whisper',
      timestamp: Date.now(),
      originRoomId: 'room-1',
      visibility: 'private',
      relatedEntities: [],
      data: {
        actorId: 'sender-id',
        actorName: 'Sender',
        targetId: 'target-id',
        targetName: 'Target',
        message: 'Hidden Message',
      },
    };

    it('should show full message to sender', () => {
      const text = formatEventContent(event, 'sender-id');
      expect(text).toBe('You whisper to Target: "Hidden Message"');
    });

    it('should show full message to target', () => {
      const text = formatEventContent(event, 'target-id');
      expect(text).toBe('Sender whispers to you: "Hidden Message"');
    });

    it('should show nothing/generic to observer (though should be filtered by private visibility)', () => {
      const text = formatEventContent(event, 'observer-id');
      expect(text).toBe('Sender whispers something to Target.');
    });
  });
});
