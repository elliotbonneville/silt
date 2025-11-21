/**
 * Smart Argument Parser
 * Handles splitting input strings into target and message components
 */

import { type Targetable, targetingSystem } from './targeting.js';

export interface ParsedTarget<T extends Targetable> {
  target: T | null;
  remaining: string;
}

export class ArgumentParser {
  /**
   * Parse a command input into a target and the remaining message.
   * Uses a greedy matching strategy to find the longest possible target name.
   */
  parseTargetAndMessage<T extends Targetable>(input: string, candidates: T[]): ParsedTarget<T> {
    const trimmedInput = input.trim();
    if (!trimmedInput) {
      return { target: null, remaining: '' };
    }

    // 1. Handle Quoted Targets ("Town Guard" hello)
    if (trimmedInput.startsWith('"')) {
      const closingQuoteIndex = trimmedInput.indexOf('"', 1);
      if (closingQuoteIndex > -1) {
        const targetString = trimmedInput.substring(1, closingQuoteIndex);
        const remaining = trimmedInput.substring(closingQuoteIndex + 1).trim();
        const target = targetingSystem.find(targetString, candidates);
        return { target, remaining };
      }
    }

    // 2. Handle Explicit ID Mentions (@id:...)
    // These are usually exact tokens, so we look for the first space
    if (trimmedInput.startsWith('@id:')) {
      const spaceIndex = trimmedInput.indexOf(' ');
      let targetString: string;
      let remaining: string;

      if (spaceIndex === -1) {
        targetString = trimmedInput;
        remaining = '';
      } else {
        targetString = trimmedInput.substring(0, spaceIndex);
        remaining = trimmedInput.substring(spaceIndex + 1).trim();
      }

      const target = targetingSystem.find(targetString, candidates);
      // Only return if we actually matched an ID, otherwise fall through to greedy
      if (target) {
        return { target, remaining };
      }
    }

    // 3. Greedy Matching
    // Try to match longest possible prefix of the input string to a candidate

    // We want to match "Town Guard" before "Town", so we prioritize length
    const sortedCandidates = [...candidates].sort((a, b) => b.name.length - a.name.length);

    for (const candidate of sortedCandidates) {
      // Check if input starts with candidate name (case-insensitive)
      if (trimmedInput.toLowerCase().startsWith(candidate.name.toLowerCase())) {
        // Ensure boundary condition (e.g. "Rat" shouldn't match "Rattle")
        // The character after the match must be space or end of string
        const nameLen = candidate.name.length;
        if (trimmedInput.length === nameLen || trimmedInput[nameLen] === ' ') {
          // Found a match!
          const remaining = trimmedInput.substring(nameLen).trim();
          return { target: candidate, remaining };
        }
      }

      // Also check "greedy prefix match" logic from targeting system here?
      // If we have "Town G hello", targetingSystem.find("Town G") matches "Town Guard"
      // But here we need to split string.
      // The current logic only matches FULL name prefix.
      // If input is "Town G hello", candidate "Town Guard" won't match via startsWith.

      // However, "Town G" matching "Town Guard" is handled by targetingSystem.find()
      // which is used in the fallback step (4) but only for the FIRST WORD.
      // If we want "Town G hello" to work, we need to be smarter.

      // Actually, let's support the "Greedy Prefix" logic here too.
      // Iterate all possible split points? Expensive but correct.
      // Or just rely on exact full name match here, and expect users to type full names
      // or use keywords "guard hello".

      // But the test expectation "Town G hello" -> target "Town Guard" failed.
      // This means we need to support partial name matching in the parser.
    }

    // 3b. Greedy Partial Matching (for "Town G hello")
    // We need to find if any candidate name *starts with* a prefix of the input
    // AND that prefix is followed by a space/end.
    // Actually, it's the reverse: Does "Town G" match "Town Guard"?
    // Input: "Town G hello"
    // Candidate: "Town Guard"
    // "Town Guard".startsWith("Town G") is TRUE.

    // So we check if candidate name starts with (part of) input?
    // No, input starts with partial candidate name.
    // Input "Town G hello".
    // Candidate "Town Guard".
    // "Town G" is a prefix of "Town Guard".

    // We need to identify the "target part" of the input string.
    // Iterate words?
    // "Town" -> matches "Town Guard"? Yes (partial)
    // "Town G" -> matches "Town Guard"? Yes (partial)
    // "Town G hello" -> matches "Town Guard"? No.

    // Let's iterate through split points (spaces) from longest to shortest.
    const parts = trimmedInput.split(' ');
    // parts: ["Town", "G", "hello"]

    // Try "Town G hello" (full) -> targetingSystem.find -> null
    // Try "Town G" -> targetingSystem.find -> "Town Guard" (Greedy Prefix) -> MATCH!
    // Try "Town" -> targetingSystem.find -> "Town Guard" (Greedy Prefix) -> MATCH!

    // We want the longest match.
    for (let i = parts.length; i > 0; i--) {
      const potentialTargetName = parts.slice(0, i).join(' ');
      const potentialRemaining = parts.slice(i).join(' ');

      // Use strict matching to avoid over-eager partials if possible,
      // but targetingSystem.find is already fuzzy.
      // If we use targetingSystem.find("Town"), it might match "Town Guard".
      // If we use targetingSystem.find("Town G"), it matches "Town Guard".
      // If we use targetingSystem.find("Town G hello"), it returns null.

      const match = targetingSystem.find(potentialTargetName, candidates);
      if (match) {
        return { target: match, remaining: potentialRemaining };
      }
    }

    // No match found
    return { target: null, remaining: trimmedInput };
  }
}

export const argumentParser = new ArgumentParser();
