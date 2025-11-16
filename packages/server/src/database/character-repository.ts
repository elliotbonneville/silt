/**
 * Character repository - database operations for characters
 */

import type { Character } from '@prisma/client';
import { prisma } from './client.js';

export interface CreateCharacterInput {
  readonly name: string;
  readonly accountId?: string;
  readonly spawnPointId?: string; // Optional for NPCs
  readonly currentRoomId?: string; // For NPCs placed directly
  readonly hp?: number;
  readonly maxHp?: number;
  readonly attackPower?: number;
  readonly defense?: number;
}

export interface UpdateCharacterInput {
  readonly currentRoomId?: string;
  readonly hp?: number;
  readonly maxHp?: number;
  readonly attackPower?: number;
  readonly defense?: number;
  readonly isAlive?: boolean;
  readonly isDead?: boolean;
  readonly lastActionAt?: Date;
  readonly diedAt?: Date;
}

/**
 * Create a new character
 */
export async function createCharacter(input: CreateCharacterInput): Promise<Character> {
  let currentRoomId: string;

  // Players use spawn points, NPCs are placed directly
  if (input.spawnPointId) {
    const spawnPoint = await prisma.item.findUnique({
      where: { id: input.spawnPointId },
    });

    if (!spawnPoint?.roomId) {
      throw new Error('Invalid spawn point');
    }

    currentRoomId = spawnPoint.roomId;
  } else if (input.currentRoomId) {
    currentRoomId = input.currentRoomId;
  } else {
    throw new Error('Must provide either spawnPointId or currentRoomId');
  }

  const data: {
    name: string;
    currentRoomId: string;
    spawnPointId?: string;
    hp: number;
    maxHp: number;
    attackPower: number;
    defense: number;
    accountId?: string;
  } = {
    name: input.name,
    currentRoomId,
    hp: input.hp ?? 100,
    maxHp: input.maxHp ?? 100,
    attackPower: input.attackPower ?? 10,
    defense: input.defense ?? 5,
  };

  if (input.spawnPointId !== undefined) {
    data.spawnPointId = input.spawnPointId;
  }

  if (input.accountId !== undefined) {
    data.accountId = input.accountId;
  }

  return await prisma.character.create({ data });
}

/**
 * Find character by ID
 */
export async function findCharacterById(id: string): Promise<Character | null> {
  return await prisma.character.findUnique({
    where: { id },
  });
}

/**
 * Find all characters for an account
 */
export async function findCharactersByAccountId(accountId: string): Promise<Character[]> {
  return await prisma.character.findMany({
    where: { accountId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Find all alive characters for an account
 */
export async function findAliveCharactersByAccountId(accountId: string): Promise<Character[]> {
  return await prisma.character.findMany({
    where: {
      accountId,
      isAlive: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update character
 */
export async function updateCharacter(id: string, input: UpdateCharacterInput): Promise<Character> {
  return await prisma.character.update({
    where: { id },
    data: input,
  });
}

/**
 * Mark character as dead
 */
export async function markCharacterDead(id: string): Promise<Character> {
  return await prisma.character.update({
    where: { id },
    data: {
      isAlive: false,
      isDead: true,
      diedAt: new Date(),
      hp: 0,
    },
  });
}

/**
 * Delete character (hard delete - use with caution)
 */
export async function deleteCharacter(id: string): Promise<void> {
  await prisma.character.delete({
    where: { id },
  });
}

/**
 * Find all characters
 */
export async function findAllCharacters(): Promise<Character[]> {
  return prisma.character.findMany();
}
