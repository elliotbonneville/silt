/**
 * Navigation commands - movement and room observation
 */

import { nanoid } from 'nanoid';
import type { CommandContext, CommandResult } from './commands.js';

/**
 * Execute the 'look' command
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
 * Execute the 'go' command
 */
export async function executeGoCommand(
  ctx: CommandContext,
  direction: string,
): Promise<CommandResult> {
  const currentRoom = ctx.world.getRoom(ctx.character.currentRoomId);
  if (!currentRoom) return { success: false, events: [], error: 'Current room not found' };

  const targetRoomId = ctx.world.getRoomExit(ctx.character.currentRoomId, direction);
  if (!targetRoomId) return { success: false, events: [], error: `There is no exit ${direction}.` };
  if (!ctx.world.getRoom(targetRoomId))
    return { success: false, events: [], error: 'Target room not found' };

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
