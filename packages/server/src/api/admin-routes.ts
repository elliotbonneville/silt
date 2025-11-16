/**
 * Admin routes - debugging and monitoring endpoints
 */

import type { Express } from 'express';
import { getEventCount, queryGameEvents } from '../database/event-repository.js';

export function setupAdminRoutes(app: Express): void {
  /**
   * GET /admin/map - Get current world map structure
   */
  app.get('/admin/map', async (_req, res) => {
    try {
      const { findAllRooms } = await import('../database/room-repository.js');
      const { findAllCharacters } = await import('../database/character-repository.js');
      const { findAllItems } = await import('../database/item-repository.js');

      const [rooms, characters, items] = await Promise.all([
        findAllRooms(),
        findAllCharacters(),
        findAllItems(),
      ]);

      const roomData = rooms.map((room) => {
        const roomChars = characters.filter((c) => c.currentRoomId === room.id && c.isAlive);
        const roomItems = items.filter((i) => i.roomId === room.id);

        const exitsData: unknown = JSON.parse(room.exitsJson);
        const exits: Record<string, string> = {};
        if (typeof exitsData === 'object' && exitsData !== null) {
          Object.assign(exits, exitsData);
        }

        return {
          id: room.id,
          name: room.name,
          description: room.description,
          exits,
          occupants: roomChars.length,
          items: roomItems.length,
          occupantList: roomChars.map((c) => ({
            id: c.id,
            name: c.name,
            isNpc: c.accountId === null,
            hp: c.hp,
            maxHp: c.maxHp,
          })),
          itemList: roomItems.map((i) => ({
            id: i.id,
            name: i.name,
            itemType: i.itemType,
          })),
        };
      });

      res.json({ rooms: roomData });
    } catch {
      res.status(500).json({ error: 'Failed to load map data' });
    }
  });

  /**
   * GET /admin/events - Query historical game events
   * Query params: limit, offset, types (comma-separated), startTime, endTime, roomId
   */
  app.get('/admin/events', async (req, res) => {
    try {
      const limitQuery = req.query['limit'];
      const offsetQuery = req.query['offset'];
      const typesParam = req.query['types'];
      const startTimeQuery = req.query['startTime'];
      const endTimeQuery = req.query['endTime'];
      const roomIdQuery = req.query['roomId'];

      const limit = typeof limitQuery === 'string' ? Number.parseInt(limitQuery, 10) : 100;
      const offset = typeof offsetQuery === 'string' ? Number.parseInt(offsetQuery, 10) : 0;
      const eventTypes =
        typeof typesParam === 'string' && typesParam ? typesParam.split(',') : undefined;
      const startTime =
        typeof startTimeQuery === 'string'
          ? new Date(Number.parseInt(startTimeQuery, 10))
          : undefined;
      const endTime =
        typeof endTimeQuery === 'string' ? new Date(Number.parseInt(endTimeQuery, 10)) : undefined;
      const originRoomId = typeof roomIdQuery === 'string' ? roomIdQuery : undefined;

      const queryOptions = {
        limit,
        offset,
        ...(eventTypes ? { eventTypes } : {}),
        ...(startTime ? { startTime } : {}),
        ...(endTime ? { endTime } : {}),
        ...(originRoomId ? { originRoomId } : {}),
      };

      const countOptions = {
        ...(eventTypes ? { eventTypes } : {}),
        ...(startTime ? { startTime } : {}),
        ...(endTime ? { endTime } : {}),
      };

      const [events, total] = await Promise.all([
        queryGameEvents(queryOptions),
        getEventCount(countOptions),
      ]);

      res.json({
        events: events.map((e) => ({
          id: e.id,
          type: e.type,
          timestamp: e.timestamp.getTime(),
          originRoomId: e.originRoomId,
          content: e.content,
          data: e.dataJson ? JSON.parse(e.dataJson) : undefined,
          visibility: e.visibility,
          attenuated: e.attenuated,
        })),
        total,
        limit,
        offset,
      });
    } catch {
      res.status(500).json({ error: 'Failed to query events' });
    }
  });
}
