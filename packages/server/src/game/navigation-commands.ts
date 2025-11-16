/**
 * Navigation commands - movement and room observation
 */

import { findRoomById } from '../database/room-repository.js';
import type { CommandContext, CommandResult } from './commands.js';
import { createEvent } from './create-game-event.js';
import { getRoomData, getRoomDescription, getRoomExit } from './room-formatter.js';

/**
 * Execute the 'look' command
 */
export async function executeLookCommand(ctx: CommandContext): Promise<CommandResult> {
  const roomData = await getRoomData(ctx.character.currentRoomId, ctx.character.name);

  if (!roomData) {
    return { success: false, events: [], error: 'Current room not found' };
  }

  const text = await getRoomDescription(ctx.character.currentRoomId, ctx.character.name);

  return {
    success: true,
    events: [],
    output: {
      type: 'room',
      data: roomData,
      text,
    },
  };
}

/**
 * Execute the 'go' command
 */
export async function executeGoCommand(
  ctx: CommandContext,
  direction: string,
): Promise<CommandResult> {
  const currentDbRoom = await findRoomById(ctx.character.currentRoomId);
  if (!currentDbRoom) return { success: false, events: [], error: 'Current room not found' };

  const targetRoomId = await getRoomExit(ctx.character.currentRoomId, direction);
  if (!targetRoomId) return { success: false, events: [], error: `There is no exit ${direction}.` };

  const targetDbRoom = await findRoomById(targetRoomId);
  if (!targetDbRoom) return { success: false, events: [], error: 'Target room not found' };

  const roomData = await getRoomData(targetRoomId, ctx.character.name);
  if (!roomData) {
    return { success: false, events: [], error: 'Target room not found' };
  }

  const text = await getRoomDescription(targetRoomId, ctx.character.name);

  return {
    success: true,
    events: [
      createEvent('movement', ctx.character.currentRoomId, 'room', {
        actorId: ctx.character.id,
        actorName: ctx.character.name,
        fromRoomId: ctx.character.currentRoomId,
        toRoomId: targetRoomId,
        direction,
      }),
    ],
    output: {
      type: 'room',
      data: roomData,
      text,
    },
  };
}
