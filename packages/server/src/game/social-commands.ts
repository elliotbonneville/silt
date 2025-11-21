/**
 * Social commands - communication and emotes
 */

import { findCharactersInRoom } from '../database/character-repository.js';
import type { CommandContext, CommandResult } from './commands.js';
import { createEvent } from './create-game-event.js';
import { argumentParser } from './utils/argument-parser.js';

/**
 * Execute the 'say' command
 */
export function executeSayCommand(ctx: CommandContext, message: string): CommandResult {
  if (!message.trim()) return { success: false, events: [], error: 'Say what?' };

  return {
    success: true,
    events: [
      createEvent(
        'speech',
        ctx.character.currentRoomId,
        'room',
        {
          actorId: ctx.character.id,
          actorName: ctx.character.name,
          message,
        },
        [
          {
            id: ctx.character.id,
            name: ctx.character.name,
            type: 'character',
          },
        ],
      ),
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
      createEvent(
        'shout',
        ctx.character.currentRoomId,
        'room',
        {
          actorId: ctx.character.id,
          actorName: ctx.character.name,
          message,
        },
        [
          {
            id: ctx.character.id,
            name: ctx.character.name,
            type: 'character',
          },
        ],
      ),
    ],
  };
}

/**
 * Execute the 'tell' command (conversation)
 */
export async function executeTellCommand(
  ctx: CommandContext,
  fullInput: string,
): Promise<CommandResult> {
  const roomCharacters = await findCharactersInRoom(ctx.character.currentRoomId);
  const { target, remaining: message } = argumentParser.parseTargetAndMessage(
    fullInput,
    roomCharacters,
  );

  // Check for missing target or empty message
  // The argument parser ensures 'remaining' is trimmed, but we need to check if it's empty
  if (!target) return { success: false, events: [], error: 'Tell who?' };
  if (!message) return { success: false, events: [], error: 'Tell them what?' };

  if (target.id === ctx.character.id) {
    return { success: false, events: [], error: 'Talking to yourself?' };
  }

  return {
    success: true,
    events: [
      createEvent(
        'tell',
        ctx.character.currentRoomId,
        'room',
        {
          actorId: ctx.character.id,
          actorName: ctx.character.name,
          targetId: target.id,
          targetName: target.name,
          message,
        },
        [
          {
            id: ctx.character.id,
            name: ctx.character.name,
            type: 'character',
          },
          {
            id: target.id,
            name: target.name,
            type: 'character',
          },
        ],
      ),
    ],
  };
}

/**
 * Execute the 'whisper' command (secret)
 */
export async function executeWhisperCommand(
  ctx: CommandContext,
  fullInput: string,
): Promise<CommandResult> {
  const roomCharacters = await findCharactersInRoom(ctx.character.currentRoomId);
  const { target, remaining: message } = argumentParser.parseTargetAndMessage(
    fullInput,
    roomCharacters,
  );

  if (!target) return { success: false, events: [], error: 'Whisper to who?' };
  if (!message) return { success: false, events: [], error: 'Whisper what?' };

  if (target.id === ctx.character.id) {
    return { success: false, events: [], error: 'Whispering to yourself?' };
  }

  return {
    success: true,
    events: [
      createEvent(
        'whisper',
        ctx.character.currentRoomId,
        'private',
        {
          actorId: ctx.character.id,
          actorName: ctx.character.name,
          targetId: target.id,
          targetName: target.name,
          message,
        },
        [
          {
            id: ctx.character.id,
            name: ctx.character.name,
            type: 'character',
          },
          {
            id: target.id,
            name: target.name,
            type: 'character',
          },
        ],
      ),
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
      createEvent(
        'emote',
        ctx.character.currentRoomId,
        'room',
        {
          actorId: ctx.character.id,
          actorName: ctx.character.name,
          action,
        },
        [
          {
            id: ctx.character.id,
            name: ctx.character.name,
            type: 'character',
          },
        ],
      ),
    ],
  };
}
