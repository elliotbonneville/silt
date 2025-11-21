/**
 * Combat command system - attack and defense commands
 */

import { findCharacterInRoom } from '../database/character-repository.js';
import type { CommandContext, CommandResult } from './commands.js';
import { listeningManager } from './listening-manager.js';
import { executeGoCommand } from './navigation-commands.js';

/**
 * Execute the 'attack' command
 */
export async function executeAttackCommand(
  ctx: CommandContext,
  targetName: string,
): Promise<CommandResult> {
  if (!ctx.combatSystem) {
    return { success: false, events: [], error: 'Combat system not available.' };
  }

  if (!targetName) return { success: false, events: [], error: 'Attack who?' };

  // Check if listening - can't do both
  if (listeningManager.getListeningTarget(ctx.character.id) !== undefined) {
    return {
      success: false,
      events: [],
      error: "You can't fight while trying to eavesdrop! Use 'stop' first.",
    };
  }

  const attacker = ctx.character;
  const target = await findCharacterInRoom(attacker.currentRoomId, targetName);

  if (!target) {
    return { success: false, events: [], error: `You don't see "${targetName}" here.` };
  }

  if (target.id === attacker.id) {
    return { success: false, events: [], error: "You can't attack yourself!" };
  }

  if (!target.isAlive) {
    return { success: false, events: [], error: `${target.name} is already dead.` };
  }

  // Start auto-combat
  await ctx.combatSystem.startCombat(attacker.id, target.id);

  return {
    success: true,
    events: [],
    output: {
      type: 'system_message',
      data: { message: `You attack ${target.name}!` },
      text: `You attack ${target.name}!`,
    },
  };
}

/**
 * Execute the 'flee' command
 */
export async function executeFleeCommand(ctx: CommandContext): Promise<CommandResult> {
  if (!ctx.combatSystem) {
    return { success: false, events: [], error: 'Combat system not available.' };
  }

  const result = await ctx.combatSystem.flee(ctx.character.id);

  if (!result.success) {
    return {
      success: false,
      events: [],
      output: {
        type: 'system_message',
        data: { message: result.message },
        text: result.message,
      },
    };
  }

  if (result.direction) {
    // Execute move
    const moveResult = await executeGoCommand(ctx, result.direction);

    // Create combined message
    const fleeMessage = `${result.message}\n${moveResult.output?.text || ''}`;

    return {
      ...moveResult,
      output: {
        ...(moveResult.output || { type: 'system_message', data: { message: '' }, text: '' }),
        text: fleeMessage, // Override text display
        // We preserve the type/data of the move result (usually 'room') so UI can render the room
      },
    };
  }

  // Should only happen if success=true but no direction (e.g. just stopped combat)
  return {
    success: true,
    events: [],
    output: {
      type: 'system_message',
      data: { message: result.message },
      text: result.message,
    },
  };
}

/**
 * Execute the 'stop' command
 */
export async function executeStopCommand(ctx: CommandContext): Promise<CommandResult> {
  if (!ctx.combatSystem) {
    return { success: false, events: [], error: 'Combat system not available.' };
  }

  const wasInCombat = ctx.combatSystem.stopCombat(ctx.character.id);
  const wasListening = listeningManager.getListeningTarget(ctx.character.id) !== undefined;

  if (wasListening) {
    listeningManager.stopListening(ctx.character.id);
  }

  if (wasInCombat && wasListening) {
    return {
      success: true,
      events: [],
      output: {
        type: 'system_message',
        data: { message: 'You stop fighting and listening.' },
        text: 'You stop fighting and listening.',
      },
    };
  }

  if (wasInCombat) {
    return {
      success: true,
      events: [],
      output: {
        type: 'system_message',
        data: { message: 'You stop fighting.' },
        text: 'You stop fighting.',
      },
    };
  }

  if (wasListening) {
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

  return {
    success: false,
    events: [],
    error: "You aren't fighting or listening to anyone.",
  };
}
