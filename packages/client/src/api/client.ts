/**
 * REST API client for character management
 * Types are imported from @silt/shared (single source of truth: Prisma → Zod → Shared)
 */

import type { CharacterListItem, CharacterResponse } from '@silt/shared';

// Re-export types for convenience
export type { CharacterListItem, CharacterResponse };

const API_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000';

/**
 * List all characters for an account
 */
export async function listCharacters(username: string): Promise<CharacterListItem[]> {
  const response = await fetch(`${API_URL}/api/accounts/${username}/characters`);
  if (!response.ok) {
    throw new Error('Failed to load characters');
  }
  const data = await response.json();
  return data.characters;
}

/**
 * Create a new character
 */
export async function createCharacter(username: string, name: string): Promise<CharacterResponse> {
  const response = await fetch(`${API_URL}/api/accounts/${username}/characters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create character');
  }

  const data = await response.json();
  return data.character;
}

/**
 * Get character details
 */
export async function getCharacter(id: string): Promise<CharacterResponse> {
  const response = await fetch(`${API_URL}/api/characters/${id}`);
  if (!response.ok) {
    throw new Error('Failed to get character');
  }
  const data = await response.json();
  return data.character;
}

/**
 * Retire (delete) a character
 */
export async function retireCharacter(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/characters/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to retire character');
  }
}
