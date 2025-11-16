/**
 * Social commands - communication and emotes
 */

import type { CommandContext, CommandResult } from './commands.js';
import { createEvent } from './create-game-event.js';

/**
 * Execute the 'say' command
 */
export function executeSayCommand(ctx: CommandContext, message: string): CommandResult {
  if (!message.trim()) return { success: false, events: [], error: 'Say what?' };

  return {
    success: true,
    events: [
      createEvent('speech', ctx.character.currentRoomId, 'room', {
        actorId: ctx.character.id,
        actorName: ctx.character.name,
        message,
      }),
    ],
  };
}

/**
 * Execute the 'shout' command
 */
export function executeShoutCommand(ctx: CommandContext, message: string): CommandResult {
  if (!message.trim()) return { success: false, events: [], error: 'Shout what?' };

  return {
    success: true,
    events: [
      createEvent('shout', ctx.character.currentRoomId, 'room', {
        actorId: ctx.character.id,
        actorName: ctx.character.name,
        message,
      }),
    ],
  };
}

/**
 * Execute the 'emote' command
 */
export function executeEmoteCommand(ctx: CommandContext, action: string): CommandResult {
  if (!action.trim()) return { success: false, events: [], error: 'Emote what?' };

  return {
    success: true,
    events: [
      createEvent('emote', ctx.character.currentRoomId, 'room', {
        actorId: ctx.character.id,
        actorName: ctx.character.name,
        action,
      }),
    ],
  };
}
