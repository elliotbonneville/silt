import { describe, expect, it } from 'vitest';
import { type Targetable, targetingSystem } from '../targeting.js';

describe('TargetingSystem', () => {
  const guard1: Targetable = { id: '1', name: 'Town Guard', keywords: ['town', 'guard'] };
  const guard2: Targetable = { id: '2', name: 'Elite Guard', keywords: ['elite', 'guard'] };
  const rat: Targetable = { id: '3', name: 'Giant Rat', keywords: ['giant', 'rat'] };
  const sword: Targetable = { id: '4', name: 'Iron Sword', keywords: ['iron', 'sword'] };

  const candidates = [guard1, guard2, rat, sword];

  it('should find explicit ID match', () => {
    const result = targetingSystem.find('@id:3', candidates);
    expect(result).toBe(rat);
  });

  it('should find exact name match (case insensitive)', () => {
    const result = targetingSystem.find('town guard', candidates);
    expect(result).toBe(guard1);
  });

  it('should find by partial name (greedy prefix)', () => {
    const result = targetingSystem.find('Town G', candidates);
    expect(result).toBe(guard1);
  });

  it('should find by keyword', () => {
    const result = targetingSystem.find('rat', candidates);
    expect(result).toBe(rat);
  });

  it('should find ordinal match (2.guard)', () => {
    // Candidates order matters for ordinal
    const orderedCandidates = [guard1, guard2, rat];
    const result = targetingSystem.find('2.guard', orderedCandidates);
    expect(result).toBe(guard2);
  });

  it('should find ordinal match (1.guard)', () => {
    const orderedCandidates = [guard1, guard2, rat];
    const result = targetingSystem.find('1.guard', orderedCandidates);
    expect(result).toBe(guard1);
  });

  it('should return null for non-existent target', () => {
    const result = targetingSystem.find('dragon', candidates);
    expect(result).toBeNull();
  });

  it('should handle extra spaces', () => {
    const result = targetingSystem.find('  rat  ', candidates);
    expect(result).toBe(rat);
  });
});
