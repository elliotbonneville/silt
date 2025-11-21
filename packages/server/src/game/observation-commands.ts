/**
 * Observation commands - examining items, characters, and environment
 */

import { findCharacterInRoom } from '../database/character-repository.js';
import {
  findItemsInInventory,
  findItemsInRoom,
  getItemStats,
} from '../database/item-repository.js';
import type { CommandContext, CommandResult } from './commands.js';
import { listeningManager } from './listening-manager.js';
import { argumentParser } from './utils/argument-parser.js';

/**
 * Execute the 'examine' command
 */
export async function executeExamineCommand(
  ctx: CommandContext,
  targetName: string,
): Promise<CommandResult> {
  if (!targetName) return { success: false, events: [], error: 'Examine what?' };

  // Try to find an item first
  const itemResult = await tryExamineItem(ctx, targetName);
  if (itemResult) return itemResult;

  // Try to find a character second
  const characterResult = await tryExamineCharacter(ctx, targetName);
  if (characterResult) return characterResult;

  return { success: false, events: [], error: `You don't see "${targetName}" here.` };
}

/**
 * Execute the 'listen' command
 * Allows you to overhear 'tell' conversations directed at the target
 */
export async function executeListenCommand(
  ctx: CommandContext,
  fullInput: string,
): Promise<CommandResult> {
  // Parse input using smart parser to handle multi-word names like "Town Guard"
  // We treat the "message" part as empty here since listen only takes a target
  // But since we don't have candidates yet, we might need to fetch them first.
  // Actually, simple string matching might be enough if we just want "listen <target>"
  // But to be consistent with other commands, let's use the parser if we have candidates.

  // However, "stop" is a special keyword that isn't an entity.
  const trimmedInput = fullInput.trim();

  if (!trimmedInput) {
    return { success: false, events: [], error: 'Listen to whom?' };
  }

  if (trimmedInput.toLowerCase() === 'stop' || trimmedInput.toLowerCase() === 'none') {
    listeningManager.stopListening(ctx.character.id);
    return {
      success: true,
      events: [],
      output: {
        type: 'system_message',
        data: { message: 'You stop listening to conversations.' },
        text: 'You stop listening to conversations.',
      },
    };
  }

  // Check if in combat
  if (ctx.combatSystem?.isInCombat(ctx.character.id)) {
    return {
      success: false,
      events: [],
      error: "You can't focus on listening while fighting!",
    };
  }

  // Find target using smart parsing
  // We only look for characters to listen to
  const roomCharacters = await findCharacterInRoom(ctx.character.currentRoomId, trimmedInput);

  if (!roomCharacters) {
    return { success: false, events: [], error: `You don't see "${trimmedInput}" here.` };
  }

  const target = roomCharacters; // findCharacterInRoom returns a single match now

  if (target.id === ctx.character.id) {
    return { success: false, events: [], error: "You can't eavesdrop on yourself!" };
  }

  listeningManager.startListening(ctx.character.id, target.id);

  return {
    success: true,
    events: [],
    output: {
      type: 'system_message',
      data: { message: `You focus your attention on ${target.name}, listening for conversations.` },
      text: `You focus your attention on ${target.name}, listening for conversations.`,
    },
  };
}

async function tryExamineItem(
  ctx: CommandContext,
  targetName: string,
): Promise<CommandResult | null> {
  // We search both inventory and room
  // We can fetch all candidates and let targeting system pick best match
  const inventoryItems = await findItemsInInventory(ctx.character.id);
  const roomItems = await findItemsInRoom(ctx.character.currentRoomId);
  const allCandidates = [...inventoryItems, ...roomItems];

  const { target } = argumentParser.parseTargetAndMessage(targetName, allCandidates);

  if (!target) return null;
  const item = target;

  const stats = getItemStats(item);
  const statLines: string[] = [];
  if (stats.damage) statLines.push(`Damage: +${stats.damage}`);
  if (stats.defense) statLines.push(`Defense: +${stats.defense}`);
  if (stats.healing) statLines.push(`Healing: ${stats.healing} HP`);

  const statsText = statLines.length > 0 ? `\n${statLines.join('\n')}` : '';
  const text = `${item.name}\n${item.description}${statsText}\nType: ${item.itemType}`;

  // Filter out undefined values for exact optional properties
  const cleanedStats: { damage?: number; defense?: number; healing?: number } = {};
  if (stats.damage !== undefined) cleanedStats.damage = stats.damage;
  if (stats.defense !== undefined) cleanedStats.defense = stats.defense;
  if (stats.healing !== undefined) cleanedStats.healing = stats.healing;

  return {
    success: true,
    events: [],
    output: {
      type: 'item_detail',
      data: {
        id: item.id,
        name: item.name,
        description: item.description,
        itemType: item.itemType,
        stats: cleanedStats,
      },
      text,
    },
  };
}

async function tryExamineCharacter(
  ctx: CommandContext,
  targetName: string,
): Promise<CommandResult | null> {
  // Use the repository method which now uses targeting system
  const character = await findCharacterInRoom(ctx.character.currentRoomId, targetName);

  if (!character) return null;

  // Get equipment
  const charItems = await findItemsInInventory(character.id);
  const equipped = charItems.filter((i) => i.isEquipped);
  const weapon = equipped.find((i) => i.itemType === 'weapon');
  const armor = equipped.find((i) => i.itemType === 'armor');

  const equipmentLines: string[] = [];
  if (weapon) equipmentLines.push(`Weapon: ${weapon.name}`);
  if (armor) equipmentLines.push(`Armor: ${armor.name}`);
  const equipmentText =
    equipmentLines.length > 0 ? `\n\nEquipment:\n${equipmentLines.join('\n')}` : '';

  // Determine health status
  const hpPercent = character.maxHp > 0 ? (character.hp / character.maxHp) * 100 : 0;
  let healthStatus = 'Health: Unknown';
  if (hpPercent >= 100) healthStatus = 'Health: Perfect condition';
  else if (hpPercent > 75) healthStatus = 'Health: Slightly scratched';
  else if (hpPercent > 50) healthStatus = 'Health: Wounded';
  else if (hpPercent > 25) healthStatus = 'Health: Badly wounded';
  else if (hpPercent > 0) healthStatus = 'Health: Near death';
  else healthStatus = 'Health: Dead';

  const description = character.description ? `\n${character.description}` : '';
  const text = `${character.name}${description}\n${healthStatus}\nAttack: ${character.attackPower}\nDefense: ${character.defense}${equipmentText}`;

  return {
    success: true,
    events: [],
    output: {
      type: 'character_detail',
      data: {
        id: character.id,
        name: character.name,
        description: character.description,
        stats: {
          hp: character.hp,
          maxHp: character.maxHp,
          attackPower: character.attackPower,
          defense: character.defense,
        },
        equipment: {
          ...(weapon?.name ? { weapon: weapon.name } : {}),
          ...(armor?.name ? { armor: armor.name } : {}),
        },
      },
      text,
    },
  };
}
