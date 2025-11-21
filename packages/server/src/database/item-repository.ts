/**
 * Item repository - database operations for items
 */

import type { Item } from '@prisma/client';
import { targetingSystem } from '../game/utils/targeting.js';
import { prisma } from './client.js';
import { type ItemStatsData, parseItemStats } from './schemas.js';

export interface CreateItemInput {
  readonly name: string;
  readonly description: string;
  readonly itemType: 'weapon' | 'armor' | 'consumable' | 'misc';
  readonly stats?: ItemStatsData;
  readonly roomId?: string;
  readonly characterId?: string;
}

/**
 * Create a new item
 */
export async function createItem(input: CreateItemInput): Promise<Item> {
  const data: {
    name: string;
    description: string;
    itemType: string;
    statsJson: string;
    roomId?: string;
    characterId?: string;
  } = {
    name: input.name,
    description: input.description,
    itemType: input.itemType,
    statsJson: JSON.stringify(input.stats ?? {}),
  };

  if (input.roomId !== undefined) {
    data.roomId = input.roomId;
  }

  if (input.characterId !== undefined) {
    data.characterId = input.characterId;
  }

  return await prisma.item.create({ data });
}

/**
 * Find item by ID
 */
export async function findItemById(id: string): Promise<Item | null> {
  return await prisma.item.findUnique({
    where: { id },
  });
}

/**
 * Find items in a room
 */
export async function findItemsInRoom(roomId: string): Promise<Item[]> {
  return await prisma.item.findMany({
    where: { roomId },
    orderBy: { name: 'asc' },
  });
}

/**
 * Find item in a room using the targeting system
 */
export async function findItemInRoom(roomId: string, searchQuery: string): Promise<Item | null> {
  const items = await prisma.item.findMany({
    where: { roomId },
  });

  return targetingSystem.find(searchQuery, items);
}

/**
 * Find items in character inventory
 */
export async function findItemsInInventory(characterId: string): Promise<Item[]> {
  return await prisma.item.findMany({
    where: { characterId },
    orderBy: { name: 'asc' },
  });
}

/**
 * Find equipped items for a character
 */
export async function findEquippedItems(characterId: string): Promise<Item[]> {
  return await prisma.item.findMany({
    where: {
      characterId,
      isEquipped: true,
    },
  });
}

/**
 * Move item to character inventory
 */
export async function moveItemToInventory(itemId: string, characterId: string): Promise<Item> {
  return await prisma.item.update({
    where: { id: itemId },
    data: {
      characterId,
      roomId: null,
    },
  });
}

/**
 * Move item to room
 */
export async function moveItemToRoom(itemId: string, roomId: string): Promise<Item> {
  return await prisma.item.update({
    where: { id: itemId },
    data: {
      roomId,
      characterId: null,
      isEquipped: false,
    },
  });
}

/**
 * Equip item
 */
export async function equipItem(itemId: string): Promise<Item> {
  return await prisma.item.update({
    where: { id: itemId },
    data: { isEquipped: true },
  });
}

/**
 * Unequip item
 */
export async function unequipItem(itemId: string): Promise<Item> {
  return await prisma.item.update({
    where: { id: itemId },
    data: { isEquipped: false },
  });
}

/**
 * Delete item
 */
export async function deleteItem(itemId: string): Promise<void> {
  await prisma.item.delete({
    where: { id: itemId },
  });
}

/**
 * Get item stats as typed object
 */
export function getItemStats(item: Item): ItemStatsData {
  return parseItemStats(item.statsJson);
}

/**
 * Get default spawn point ID
 */
export async function getDefaultSpawnPointId(): Promise<string> {
  const spawnPoint = await prisma.item.findFirst({
    where: {
      itemType: 'spawn_point',
      roomId: 'town-square',
    },
  });

  if (!spawnPoint) {
    throw new Error('No spawn point found in starting room');
  }

  return spawnPoint.id;
}

/**
 * Find all items
 */
export async function findAllItems(): Promise<Item[]> {
  return prisma.item.findMany();
}
