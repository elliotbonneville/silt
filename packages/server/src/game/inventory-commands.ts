/**
 * Inventory command system - item management commands
 */

import type { Character } from '@prisma/client';
import type { EventVisibility, GameEvent, GameEventType } from '@silt/shared';
import { nanoid } from 'nanoid';
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

/**
 * Create a game event with common fields filled in
 */
function createEvent(
  type: GameEventType,
  roomId: string,
  content: string,
  visibility: EventVisibility,
  data?: Record<string, unknown>,
): GameEvent {
  const event: GameEvent = {
    id: `event-${nanoid(10)}`,
    type,
    timestamp: Date.now(),
    originRoomId: roomId,
    content,
    relatedEntities: [],
    visibility,
  };

  if (data !== undefined) {
    return { ...event, data };
  }

  return event;
}

/**
 * Execute the 'inventory' command
 */
export async function executeInventoryCommand(ctx: CommandContext): Promise<CommandResult> {
  const items = await findItemsInInventory(ctx.character.id);
  const roomId = ctx.character.currentRoomId;

  if (items.length === 0) {
    return {
      success: true,
      events: [
        createEvent('system', roomId, 'Inventory is empty.', 'private', {
          actorId: ctx.character.id,
          items: [],
        }),
      ],
    };
  }

  const itemData = items.map((item) => ({
    id: item.id,
    name: item.name,
    isEquipped: item.isEquipped,
  }));

  const itemList = items
    .map((item) => `- ${item.name}${item.isEquipped ? ' (equipped)' : ''}`)
    .join('\n');

  return {
    success: true,
    events: [
      createEvent('system', roomId, `Inventory:\n${itemList}`, 'private', {
        actorId: ctx.character.id,
        items: itemData,
      }),
    ],
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

  await moveItemToInventory(item.id, ctx.character.id);

  return {
    success: true,
    events: [
      createEvent(
        'item_pickup',
        ctx.character.currentRoomId,
        `${ctx.character.name} takes ${item.name}.`,
        'room',
        {
          actorId: ctx.character.id,
          actorName: ctx.character.name,
          itemId: item.id,
          itemName: item.name,
        },
      ),
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
      createEvent(
        'item_drop',
        ctx.character.currentRoomId,
        `${ctx.character.name} drops ${item.name}.`,
        'room',
        {
          actorId: ctx.character.id,
          actorName: ctx.character.name,
          itemId: item.id,
          itemName: item.name,
        },
      ),
    ],
  };
}

/**
 * Execute the 'examine' command
 */
export async function executeExamineCommand(
  ctx: CommandContext,
  itemName: string,
): Promise<CommandResult> {
  if (!itemName) return { success: false, events: [], error: 'Examine what?' };

  const inventoryItems = await findItemsInInventory(ctx.character.id);
  const roomItems = await findItemsInRoom(ctx.character.currentRoomId);
  const item = [...inventoryItems, ...roomItems].find(
    (i) => i.name.toLowerCase() === itemName.toLowerCase(),
  );

  if (!item) return { success: false, events: [], error: `You don't see "${itemName}" here.` };

  const stats = getItemStats(item);
  const statLines: string[] = [];

  if (stats.damage) statLines.push(`Damage: +${stats.damage}`);
  if (stats.defense) statLines.push(`Defense: +${stats.defense}`);
  if (stats.healing) statLines.push(`Healing: ${stats.healing} HP`);

  const statsText = statLines.length > 0 ? `\n${statLines.join('\n')}` : '';
  const content = `${item.name}\n${item.description}${statsText}\nType: ${item.itemType}`;

  return {
    success: true,
    events: [
      createEvent('system', ctx.character.currentRoomId, content, 'private', {
        actorId: ctx.character.id,
        itemId: item.id,
        itemName: item.name,
        itemType: item.itemType,
        stats,
      }),
    ],
  };
}

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
    events: [
      createEvent('system', ctx.character.currentRoomId, `Equipped ${item.name}.`, 'private', {
        actorId: ctx.character.id,
        itemId: item.id,
        itemName: item.name,
        itemType: item.itemType,
      }),
    ],
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
    events: [
      createEvent('system', ctx.character.currentRoomId, `Unequipped ${item.name}.`, 'private', {
        actorId: ctx.character.id,
        itemId: item.id,
        itemName: item.name,
      }),
    ],
  };
}

/**
 * Recalculate character stats based on equipped items
 */
async function recalculateCharacterStats(character: Character): Promise<void> {
  const items = await findItemsInInventory(character.id);
  const equipped = items.filter((i) => i.isEquipped);

  let attackPower = 10; // Base attack
  let defense = 5; // Base defense

  for (const item of equipped) {
    const stats = getItemStats(item);
    if (stats.damage) attackPower += stats.damage;
    if (stats.defense) defense += stats.defense;
  }

  await updateCharacter(character.id, { attackPower, defense });
}
