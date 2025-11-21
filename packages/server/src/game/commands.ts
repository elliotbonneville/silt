/**
 * Command system - main parser and router
 */

import type { Character } from '@prisma/client';
import type { CommandOutput, GameEvent } from '@silt/shared';
import { executeAttackCommand, executeFleeCommand, executeStopCommand } from './combat-commands.js';
import {
  executeDropCommand,
  executeEquipCommand,
  executeInventoryCommand,
  executeTakeCommand,
  executeUnequipCommand,
} from './inventory-commands.js';
import { executeGoCommand, executeLookCommand } from './navigation-commands.js';
import { executeExamineCommand, executeListenCommand } from './observation-commands.js';
import {
  executeEmoteCommand,
  executeSayCommand,
  executeShoutCommand,
  executeTellCommand,
  executeWhisperCommand,
} from './social-commands.js';
import type { ICombatSystem } from './systems/combat-system.js';

export interface CommandContext {
  readonly character: Character;
  readonly combatSystem?: ICombatSystem;
}

export interface CommandResult {
  readonly success: boolean;
  readonly events: readonly GameEvent[];
  readonly output?: CommandOutput; // Structured response to command issuer
  readonly error?: string;
}

const DIRECTION_MAP: Record<string, string> = {
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
  if (command in DIRECTION_MAP) {
    const fullDirection = DIRECTION_MAP[command];
    if (fullDirection) {
      return await executeGoCommand(ctx, fullDirection);
    }
  }

  switch (command) {
    case 'look':
    case 'l':
      return await executeLookCommand(ctx);

    case 'listen':
    case 'ls':
      return await executeListenCommand(ctx, args.join(' '));

    case 'go':
    case 'move':
      if (args.length === 0) {
        return { success: false, events: [], error: 'Go where?' };
      }
      return await executeGoCommand(ctx, args[0] || '');

    case 'say':
      return executeSayCommand(ctx, args.join(' '));

    case 'tell':
    case 't':
      return executeTellCommand(ctx, args.join(' '));

    case 'whisper':
    case 'w':
      return executeWhisperCommand(ctx, args.join(' '));

    case 'shout':
      return executeShoutCommand(ctx, args.join(' '));

    case 'emote':
    case 'me':
      return executeEmoteCommand(ctx, args.join(' '));

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
      return await executeAttackCommand(ctx, args.join(' '));

    case 'flee':
    case 'run':
    case 'escape':
      return await executeFleeCommand(ctx);

    case 'stop':
      return await executeStopCommand(ctx);

    default:
      return { success: false, events: [], error: `Unknown command: ${command}` };
  }
}
