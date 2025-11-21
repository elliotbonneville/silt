/**
 * Core Targeting System
 * Handles resolving natural language inputs to specific entities
 */

export interface Targetable {
  id: string;
  name: string;
  keywords?: string[]; // Optional explicit keywords
  // Helper for debugging
  [key: string]: unknown;
}

export interface TargetingResult<T extends Targetable> {
  match: T | null;
  method: 'id' | 'exact' | 'ordinal' | 'prefix' | 'keyword' | null;
}

export class TargetingSystem {
  /**
   * Find a single target from a list of candidates based on query string
   */
  find<T extends Targetable>(query: string, candidates: T[]): T | null {
    const trimmed = query.trim();
    if (!trimmed) return null;

    // 1. Explicit ID Match (@id:...)
    if (trimmed.startsWith('@id:')) {
      const id = trimmed.substring(4);
      return candidates.find((c) => c.id === id) || null;
    }

    // 2. Exact Name Match (Case insensitive)
    const exactMatch = candidates.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exactMatch) return exactMatch;

    // 3. Ordinal Match (2.guard)
    const ordinalMatch = this.findOrdinal(trimmed, candidates);
    if (ordinalMatch) return ordinalMatch;

    // 4. Greedy Prefix Match (Start of name)
    // "Town G" matches "Town Guard"
    const prefixMatch = candidates.find((c) =>
      c.name.toLowerCase().startsWith(trimmed.toLowerCase()),
    );
    if (prefixMatch) return prefixMatch;

    // 5. Keyword Match
    // "guard" matches "Town Guard"
    const keywordMatch = candidates.find((c) => {
      const keywords = this.generateKeywords(c);
      return keywords.includes(trimmed.toLowerCase());
    });

    return keywordMatch || null;
  }

  /**
   * Find ordinal target (e.g. "2.rat")
   */
  private findOrdinal<T extends Targetable>(query: string, candidates: T[]): T | null {
    const match = query.match(/^(\d+)\.(.+)$/);
    if (!match || !match[1] || !match[2]) return null;

    const index = Number.parseInt(match[1], 10);
    const keyword = match[2].toLowerCase();

    if (Number.isNaN(index) || index < 1) return null;

    let count = 0;
    for (const candidate of candidates) {
      const keywords = this.generateKeywords(candidate);
      if (
        candidate.name.toLowerCase().includes(keyword) ||
        keywords.some((k) => k.startsWith(keyword))
      ) {
        count++;
        if (count === index) return candidate;
      }
    }

    return null;
  }

  /**
   * Generate searchable keywords from an entity
   */
  private generateKeywords(entity: Targetable): string[] {
    if (entity.keywords && entity.keywords.length > 0) {
      return entity.keywords.map((k) => k.toLowerCase());
    }

    // Split name by spaces
    return entity.name
      .toLowerCase()
      .split(/\s+/)
      .filter((k) => k.length > 0); // Basic words
  }
}

export const targetingSystem = new TargetingSystem();
