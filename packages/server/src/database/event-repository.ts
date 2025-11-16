/**
 * Event repository - persist and query game events
 */

import type { GameEvent as PrismaGameEvent } from '@prisma/client';
import type { GameEvent } from '@silt/shared';
import { prisma } from './client.js';

/**
 * Save a game event to the database
 * Stores raw event data; formatting happens at delivery time
 */
export async function saveGameEvent(event: GameEvent): Promise<void> {
  await prisma.gameEvent.create({
    data: {
      id: event.id,
      type: event.type,
      timestamp: new Date(event.timestamp),
      originRoomId: event.originRoomId,
      content: event.content ?? null,
      dataJson: event.data ? JSON.stringify(event.data) : null,
      visibility: event.visibility,
      attenuated: event.attenuated ?? false,
    },
  });
}

/**
 * Query game events with filters
 */
export async function queryGameEvents(options: {
  limit?: number;
  offset?: number;
  eventTypes?: string[];
  startTime?: Date;
  endTime?: Date;
  originRoomId?: string;
}): Promise<PrismaGameEvent[]> {
  const where = {
    ...(options.eventTypes && options.eventTypes.length > 0
      ? { type: { in: options.eventTypes } }
      : {}),
    ...(options.startTime || options.endTime
      ? {
          timestamp: {
            ...(options.startTime ? { gte: options.startTime } : {}),
            ...(options.endTime ? { lte: options.endTime } : {}),
          },
        }
      : {}),
    ...(options.originRoomId ? { originRoomId: options.originRoomId } : {}),
  };

  return prisma.gameEvent.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: options.limit ?? 100,
    skip: options.offset ?? 0,
  });
}

/**
 * Get event count for statistics
 */
export async function getEventCount(options: {
  eventTypes?: string[];
  startTime?: Date;
  endTime?: Date;
}): Promise<number> {
  const where = {
    ...(options.eventTypes && options.eventTypes.length > 0
      ? { type: { in: options.eventTypes } }
      : {}),
    ...(options.startTime || options.endTime
      ? {
          timestamp: {
            ...(options.startTime ? { gte: options.startTime } : {}),
            ...(options.endTime ? { lte: options.endTime } : {}),
          },
        }
      : {}),
  };

  return prisma.gameEvent.count({ where });
}

/**
 * Delete old events (for cleanup)
 */
export async function deleteOldEvents(olderThan: Date): Promise<number> {
  const result = await prisma.gameEvent.deleteMany({
    where: { timestamp: { lt: olderThan } },
  });
  return result.count;
}
