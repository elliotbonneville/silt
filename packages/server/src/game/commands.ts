/**
 * Command system for parsing and executing player commands
 */

import type { Character } from '@prisma/client';
import type { GameEvent } from '@silt/shared';
import { nanoid } from 'nanoid';
import { executeAttackCommand } from './combat-commands.js';
import {
  executeDropCommand,
  executeEquipCommand,
  executeExamineCommand,
  executeInventoryCommand,
  executeTakeCommand,
  executeUnequipCommand,
} from './inventory-commands.js';
import type { World } from './world.js';

export interface CommandContext {
  readonly character: Character;
  readonly world: World;
  readonly getCharacterInRoom: (roomId: string, name: string) => Character | undefined;
}

export interface CommandResult {
  readonly success: boolean;
  readonly events: readonly GameEvent[];
  readonly error?: string;
}

/**
 * Parse and execute the 'look' command
 */
export async function executeLookCommand(ctx: CommandContext): Promise<CommandResult> {
  const content = await ctx.world.getRoomDescription(
    ctx.character.currentRoomId,
    ctx.character.name,
  );

  return {
    success: true,
    events: [
      {
        id: `event-${nanoid(10)}`,
        type: 'room_description',
        timestamp: Date.now(),
        originRoomId: ctx.character.currentRoomId,
        content,
        relatedEntities: [],
        visibility: 'private',
      },
    ],
  };
}

/**
 * Parse and execute the 'go' command
 */
export async function executeGoCommand(
  ctx: CommandContext,
  direction: string,
): Promise<CommandResult> {
  const currentRoom = ctx.world.getRoom(ctx.character.currentRoomId);

  if (!currentRoom) {
    return { success: false, events: [], error: 'Current room not found' };
  }

  const targetRoomId = ctx.world.getRoomExit(ctx.character.currentRoomId, direction);

  if (!targetRoomId) {
    return {
      success: false,
      events: [],
      error: `There is no exit ${direction}.`,
    };
  }

  if (!ctx.world.getRoom(targetRoomId)) {
    return { success: false, events: [], error: 'Target room not found' };
  }

  const roomDescription = await ctx.world.getRoomDescription(targetRoomId, ctx.character.name);

  return {
    success: true,
    events: [
      {
        id: `event-${nanoid(10)}`,
        type: 'movement',
        timestamp: Date.now(),
        originRoomId: ctx.character.currentRoomId,
        content: `${ctx.character.name} moves ${direction}.`,
        relatedEntities: [],
        visibility: 'room',
        data: {
          actorId: ctx.character.id,
          actorName: ctx.character.name,
          fromRoomId: ctx.character.currentRoomId,
          toRoomId: targetRoomId,
          direction,
        },
      },
      {
        id: `event-${nanoid(10)}`,
        type: 'room_description',
        timestamp: Date.now(),
        originRoomId: targetRoomId,
        content: roomDescription,
        relatedEntities: [],
        visibility: 'private',
      },
    ],
  };
}

/**
 * Execute the 'say' command
 */
export function executeSayCommand(ctx: CommandContext, message: string): CommandResult {
  if (!message.trim()) {
    return { success: false, events: [], error: 'Say what?' };
  }

  return {
    success: true,
    events: [
      {
        id: `event-${nanoid(10)}`,
        type: 'speech',
        timestamp: Date.now(),
        originRoomId: ctx.character.currentRoomId,
        content: `${ctx.character.name} says: "${message}"`,
        relatedEntities: [],
        visibility: 'room',
        data: {
          actorId: ctx.character.id,
          actorName: ctx.character.name,
          message,
        },
      },
    ],
  };
}

/**
 * Execute the 'shout' command
 */
export function executeShoutCommand(ctx: CommandContext, message: string): CommandResult {
  if (!message.trim()) {
    return { success: false, events: [], error: 'Shout what?' };
  }

  return {
    success: true,
    events: [
      {
        id: `event-${nanoid(10)}`,
        type: 'shout',
        timestamp: Date.now(),
        originRoomId: ctx.character.currentRoomId,
        content: `${ctx.character.name} shouts: "${message}"`,
        relatedEntities: [],
        visibility: 'room',
        data: {
          actorId: ctx.character.id,
          actorName: ctx.character.name,
          message,
        },
      },
    ],
  };
}

/**
 * Parse command string and execute appropriate command
 */
export async function parseAndExecuteCommand(
  input: string,
  ctx: CommandContext,
): Promise<CommandResult> {
  const trimmed = input.trim();

  if (!trimmed) {
    return { success: false, events: [], error: 'Enter a command' };
  }

  const parts = trimmed.split(/\s+/);
  const firstPart = parts[0];

  if (!firstPart) {
    return { success: false, events: [], error: 'Enter a command' };
  }

  const command = firstPart.toLowerCase();
  const args = parts.slice(1);

  // Check for directional commands first
  const directionMap: Record<string, string> = {
    n: 'north',
    s: 'south',
    e: 'east',
    w: 'west',
    u: 'up',
    d: 'down',
    north: 'north',
    south: 'south',
    east: 'east',
    west: 'west',
    up: 'up',
    down: 'down',
  };

  if (command in directionMap) {
    const fullDirection = directionMap[command];
    if (fullDirection) {
      return await executeGoCommand(ctx, fullDirection);
    }
  }

  switch (command) {
    case 'look':
    case 'l':
      return await executeLookCommand(ctx);

    case 'go':
    case 'move':
      if (args.length === 0) {
        return { success: false, events: [], error: 'Go where?' };
      }
      return await executeGoCommand(ctx, args[0] || '');

    case 'say':
      return executeSayCommand(ctx, args.join(' '));

    case 'shout':
      return executeShoutCommand(ctx, args.join(' '));

    case 'inventory':
    case 'inv':
    case 'i':
      return await executeInventoryCommand(ctx);

    case 'take':
    case 'get':
    case 'pickup':
      return await executeTakeCommand(ctx, args.join(' '));

    case 'drop':
      return await executeDropCommand(ctx, args.join(' '));

    case 'examine':
    case 'exam':
    case 'ex':
      return await executeExamineCommand(ctx, args.join(' '));

    case 'equip':
    case 'wield':
    case 'wear':
      return await executeEquipCommand(ctx, args.join(' '));

    case 'unequip':
    case 'remove':
      return await executeUnequipCommand(ctx, args.join(' '));

    case 'attack':
    case 'kill':
    case 'fight':
    case 'hit':
      return await executeAttackCommand(ctx, args.join(' '), ctx.getCharacterInRoom);

    default:
      return { success: false, events: [], error: `Unknown command: ${command}` };
  }
}
