/**
 * Inventory command system - item management commands
 */

import type { Character } from '@prisma/client';
import { updateCharacter } from '../database/character-repository.js';
import {
  equipItem,
  findItemsInInventory,
  findItemsInRoom,
  getItemStats,
  moveItemToInventory,
  moveItemToRoom,
  unequipItem,
} from '../database/item-repository.js';
import type { CommandContext, CommandResult } from './commands.js';
import { createEvent } from './create-game-event.js';

/**
 * Execute the 'inventory' command
 */
export async function executeInventoryCommand(ctx: CommandContext): Promise<CommandResult> {
  const items = await findItemsInInventory(ctx.character.id);

  if (items.length === 0) {
    return {
      success: true,
      events: [],
      output: {
        type: 'system_message',
        data: { message: 'Inventory is empty.' },
        text: 'Inventory is empty.',
      },
    };
  }

  const itemData = items.map((item) => ({
    id: item.id,
    name: item.name,
    isEquipped: item.isEquipped,
    itemType: item.itemType,
  }));

  const itemList = items
    .map((item) => `- ${item.name}${item.isEquipped ? ' (equipped)' : ''}`)
    .join('\n');

  return {
    success: true,
    events: [],
    output: {
      type: 'inventory',
      data: { items: itemData },
      text: `Inventory:\n${itemList}`,
    },
  };
}

/**
 * Execute the 'take' command
 */
export async function executeTakeCommand(
  ctx: CommandContext,
  itemName: string,
): Promise<CommandResult> {
  if (!itemName) return { success: false, events: [], error: 'Take what?' };

  const roomItems = await findItemsInRoom(ctx.character.currentRoomId);
  const item = roomItems.find((i) => i.name.toLowerCase() === itemName.toLowerCase());

  if (!item) return { success: false, events: [], error: `There is no "${itemName}" here.` };

  // Prevent taking spawn points
  if (item.itemType === 'spawn_point') {
    return { success: false, events: [], error: `You can't take ${item.name}.` };
  }

  await moveItemToInventory(item.id, ctx.character.id);

  return {
    success: true,
    events: [
      createEvent('item_pickup', ctx.character.currentRoomId, 'room', {
        actorId: ctx.character.id,
        actorName: ctx.character.name,
        itemId: item.id,
        itemName: item.name,
      }),
    ],
  };
}

/**
 * Execute the 'drop' command
 */
export async function executeDropCommand(
  ctx: CommandContext,
  itemName: string,
): Promise<CommandResult> {
  if (!itemName) return { success: false, events: [], error: 'Drop what?' };

  const inventoryItems = await findItemsInInventory(ctx.character.id);
  const item = inventoryItems.find((i) => i.name.toLowerCase() === itemName.toLowerCase());

  if (!item) return { success: false, events: [], error: `You don't have "${itemName}".` };

  // Unequip if equipped
  if (item.isEquipped) {
    await unequipItem(item.id);
    await recalculateCharacterStats(ctx.character);
  }

  await moveItemToRoom(item.id, ctx.character.currentRoomId);

  return {
    success: true,
    events: [
      createEvent('item_drop', ctx.character.currentRoomId, 'room', {
        actorId: ctx.character.id,
        actorName: ctx.character.name,
        itemId: item.id,
        itemName: item.name,
      }),
    ],
  };
}

// executeExamineCommand removed

/**
 * Execute the 'equip' command
 */
export async function executeEquipCommand(
  ctx: CommandContext,
  itemName: string,
): Promise<CommandResult> {
  if (!itemName) return { success: false, events: [], error: 'Equip what?' };

  const inventoryItems = await findItemsInInventory(ctx.character.id);
  const item = inventoryItems.find((i) => i.name.toLowerCase() === itemName.toLowerCase());

  if (!item) return { success: false, events: [], error: `You don't have "${itemName}".` };
  if (item.itemType !== 'weapon' && item.itemType !== 'armor') {
    return { success: false, events: [], error: `You can't equip ${item.name}.` };
  }
  if (item.isEquipped) {
    return { success: false, events: [], error: `${item.name} is already equipped.` };
  }

  // Unequip other items of the same type
  for (const existing of inventoryItems.filter(
    (i) => i.itemType === item.itemType && i.isEquipped,
  )) {
    await unequipItem(existing.id);
  }

  await equipItem(item.id);
  await recalculateCharacterStats(ctx.character);

  return {
    success: true,
    events: [],
    output: {
      type: 'system_message',
      data: { message: `Equipped ${item.name}.`, context: { itemId: item.id } },
      text: `Equipped ${item.name}.`,
    },
  };
}

/**
 * Execute the 'unequip' command
 */
export async function executeUnequipCommand(
  ctx: CommandContext,
  itemName: string,
): Promise<CommandResult> {
  if (!itemName) return { success: false, events: [], error: 'Unequip what?' };

  const inventoryItems = await findItemsInInventory(ctx.character.id);
  const item = inventoryItems.find((i) => i.name.toLowerCase() === itemName.toLowerCase());

  if (!item) return { success: false, events: [], error: `You don't have "${itemName}".` };
  if (!item.isEquipped) {
    return { success: false, events: [], error: `${item.name} is not equipped.` };
  }

  await unequipItem(item.id);
  await recalculateCharacterStats(ctx.character);

  return {
    success: true,
    events: [],
    output: {
      type: 'system_message',
      data: { message: `Unequipped ${item.name}.`, context: { itemId: item.id } },
      text: `Unequipped ${item.name}.`,
    },
  };
}

/**
 * Recalculate character stats based on equipped items
 */
async function recalculateCharacterStats(character: Character): Promise<void> {
  const equipped = (await findItemsInInventory(character.id)).filter((i) => i.isEquipped);
  let attackPower = 10;
  let defense = 5;

  for (const item of equipped) {
    const stats = getItemStats(item);
    if (stats.damage) attackPower += stats.damage;
    if (stats.defense) defense += stats.defense;
  }

  await updateCharacter(character.id, { attackPower, defense });
}
