/**
 * Player Log Repository
 * Persists commands, outputs, and events for reconstruction
 */

import type { PlayerLog } from '@prisma/client';
import { prisma } from './client.js';

export type LogType = 'command' | 'output' | 'event';

/**
 * Create a player log entry
 */
export async function createPlayerLog(
  characterId: string,
  type: LogType,
  payload: unknown,
): Promise<PlayerLog> {
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

  return await prisma.playerLog.create({
    data: {
      characterId,
      type,
      payload: payloadString,
    },
  });
}

/**
 * Get logs for a character
 */
export async function getPlayerLogs(characterId: string, limit = 100): Promise<PlayerLog[]> {
  return await prisma.playerLog.findMany({
    where: { characterId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
