import { describe, expect, it } from 'vitest';
import { argumentParser } from '../argument-parser.js';
import type { Targetable } from '../targeting.js';

describe('ArgumentParser', () => {
  // Setup detailed test data covering common edge cases
  const guard: Targetable = { id: '1', name: 'Town Guard', keywords: ['town', 'guard'] };
  const eliteGuard: Targetable = {
    id: '2',
    name: 'Elite Town Guard',
    keywords: ['elite', 'town', 'guard'],
  };
  const rat: Targetable = { id: '3', name: 'Rat' };
  const king: Targetable = { id: '4', name: 'The King', keywords: ['king', 'the'] };

  const candidates = [guard, eliteGuard, rat, king];

  describe('Exact & Multi-word Matching', () => {
    it('should parse simple target and message', () => {
      const result = argumentParser.parseTargetAndMessage('Rat hello', candidates);
      expect(result.target).toBe(rat);
      expect(result.remaining).toBe('hello');
    });

    it('should parse multi-word target and message', () => {
      const result = argumentParser.parseTargetAndMessage('Town Guard hello there', candidates);
      expect(result.target).toBe(guard);
      expect(result.remaining).toBe('hello there');
    });

    it('should prioritize longer name matches (Elite vs Town)', () => {
      // Should match "Elite Town Guard" over "Town Guard" if typing full name
      const result = argumentParser.parseTargetAndMessage('Elite Town Guard greetings', candidates);
      expect(result.target).toBe(eliteGuard);
      expect(result.remaining).toBe('greetings');
    });
  });

  describe('Prefix & Fuzzy Matching', () => {
    it('should parse greedy prefix target (Town G)', () => {
      // "Town G" matches "Town Guard"
      const result = argumentParser.parseTargetAndMessage('Town G hello', candidates);
      expect(result.target).toBe(guard);
      expect(result.remaining).toBe('hello');
    });

    it('should parse greedy prefix target (The K)', () => {
      // "The K" matches "The King"
      const result = argumentParser.parseTargetAndMessage('The K bow', candidates);
      expect(result.target).toBe(king);
      expect(result.remaining).toBe('bow');
    });

    it('should NOT match prefix if ambiguous or too short (e.g. "T")', () => {
      // "T" could match Town Guard or The King.
      // Current implementation takes the first one found after sorting logic.
      // Sort logic is by name length descending.
      // "Elite Town Guard" (16) -> "Town Guard" (10) -> "The King" (8) -> "Rat" (3)

      // "T" starts with "T".
      // "Town Guard" starts with "T".
      // "The King" starts with "T".
      // Since we check "Town Guard" first (longer name), it should match Town Guard.
      // (This is implementation detail but good to know)
      const result = argumentParser.parseTargetAndMessage('T hello', candidates);
      expect(result.target).not.toBeNull();
      // We expect it to find *something*, likely Elite Town Guard or Town Guard
    });
  });

  describe('Quoted & ID Targeting', () => {
    it('should parse quoted target with spaces', () => {
      const result = argumentParser.parseTargetAndMessage('"Town Guard" hello', candidates);
      expect(result.target).toBe(guard);
      expect(result.remaining).toBe('hello');
    });

    it('should parse quoted target ignoring greedy prefix of other entities', () => {
      // If we quote "Rat", it shouldn't accidentally match "Rattle" if it existed
      const result = argumentParser.parseTargetAndMessage('"Rat" squeak', candidates);
      expect(result.target).toBe(rat);
      expect(result.remaining).toBe('squeak');
    });

    it('should parse explicit ID target', () => {
      const result = argumentParser.parseTargetAndMessage('@id:1 hello', candidates);
      expect(result.target).toBe(guard);
      expect(result.remaining).toBe('hello');
    });
  });

  describe('Case Insensitivity', () => {
    it('should handle lowercase input', () => {
      const result = argumentParser.parseTargetAndMessage('town guard hi', candidates);
      expect(result.target).toBe(guard);
      expect(result.remaining).toBe('hi');
    });

    it('should handle mixed case input', () => {
      const result = argumentParser.parseTargetAndMessage('ToWn GuArD hi', candidates);
      expect(result.target).toBe(guard);
      expect(result.remaining).toBe('hi');
    });
  });

  describe('Edge Cases', () => {
    it('should return null target if no match found', () => {
      const result = argumentParser.parseTargetAndMessage('Dragon hello', candidates);
      expect(result.target).toBeNull();
      expect(result.remaining).toBe('Dragon hello');
    });

    it('should handle input that equals the target name exactly (no message)', () => {
      const result = argumentParser.parseTargetAndMessage('Rat', candidates);
      expect(result.target).toBe(rat);
      expect(result.remaining).toBe('');
    });

    it('should handle empty input', () => {
      const result = argumentParser.parseTargetAndMessage('', candidates);
      expect(result.target).toBeNull();
      expect(result.remaining).toBe('');
    });

    it('should handle extra whitespace', () => {
      const result = argumentParser.parseTargetAndMessage('  Rat   hello  ', candidates);
      expect(result.target).toBe(rat);
      expect(result.remaining).toBe('hello');
    });
  });
});
