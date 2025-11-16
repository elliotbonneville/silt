/**
 * Social commands - communication and emotes
 */

import { nanoid } from 'nanoid';
import type { CommandContext, CommandResult } from './commands.js';

/**
 * Execute the 'say' command
 */
export function executeSayCommand(ctx: CommandContext, message: string): CommandResult {
  if (!message.trim()) return { success: false, events: [], error: 'Say what?' };

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
  if (!message.trim()) return { success: false, events: [], error: 'Shout what?' };

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
 * Execute the 'emote' command
 */
export function executeEmoteCommand(ctx: CommandContext, action: string): CommandResult {
  if (!action.trim()) return { success: false, events: [], error: 'Emote what?' };

  return {
    success: true,
    events: [
      {
        id: `event-${nanoid(10)}`,
        type: 'emote',
        timestamp: Date.now(),
        originRoomId: ctx.character.currentRoomId,
        content: `${ctx.character.name} ${action}`,
        relatedEntities: [],
        visibility: 'room',
        data: {
          actorId: ctx.character.id,
          actorName: ctx.character.name,
          action,
        },
      },
    ],
  };
}
