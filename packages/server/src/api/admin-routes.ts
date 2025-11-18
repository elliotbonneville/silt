/**
 * Admin routes - debugging and monitoring endpoints
 */

import type { Character, Item, Room } from '@prisma/client';
import type { GameEvent, GameEventType } from '@silt/shared';
import type { Express } from 'express';
import {
  findAllAIAgents,
  findAllCharacters,
  findAllItems,
  findAllRooms,
  getEventCount,
  queryGameEvents,
} from '../database/index.js';
import type { GameEngine } from '../game/engine.js';
import { formatEventContent } from '../game/event-formatter.js';
import { setupAdminAgentRoutes } from './admin-agent-routes.js';

export function setupAdminRoutes(app: Express, gameEngine: GameEngine): void {
  // Setup agent-specific routes
  setupAdminAgentRoutes(app);
  /**
   * GET /admin/map - Get current world map structure
   */
  app.get('/admin/map', async (_req, res) => {
    try {
      const [rooms, characters, items, agents] = await Promise.all([
        findAllRooms(),
        findAllCharacters(),
        findAllItems(),
        findAllAIAgents(),
      ]);

      // Create a map of characterId -> agentId for quick lookup
      const characterToAgent = new Map<string, string>();
      for (const agent of agents) {
        characterToAgent.set(agent.characterId, agent.id);
      }

      const roomData = rooms.map((room: Room) => {
        const roomChars = characters.filter(
          (c: Character) => c.currentRoomId === room.id && c.isAlive,
        );
        const roomItems = items.filter((i: Item) => i.roomId === room.id);

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
          occupantList: roomChars.map((c: Character) => ({
            id: c.id,
            name: c.name,
            isNpc: c.accountId === null,
            isAIAgent: characterToAgent.has(c.id),
            agentId: characterToAgent.get(c.id) || null,
            hp: c.hp,
            maxHp: c.maxHp,
          })),
          itemList: roomItems.map((i: Item) => ({
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
        events: events.map((e) => {
          const data = e.dataJson ? JSON.parse(e.dataJson) : undefined;
          const gameEvent: GameEvent = {
            id: e.id,
            // biome-ignore lint/plugin: Database string needs to be narrowed to GameEventType
            type: e.type as GameEventType,
            timestamp: e.timestamp.getTime(),
            originRoomId: e.originRoomId,
            ...(e.content ? { content: e.content } : {}),
            data,
            // biome-ignore lint/plugin: Database string needs to be narrowed to EventVisibility
            visibility: e.visibility as 'room' | 'global' | 'private',
            attenuated: e.attenuated,
            relatedEntities: [],
          };
          // Format with omniscient perspective for admin view (no viewerActorId)
          return {
            ...gameEvent,
            content: formatEventContent(gameEvent),
          };
        }),
        total,
        limit,
        offset,
      });
    } catch {
      res.status(500).json({ error: 'Failed to query events' });
    }
  });

  /**
   * POST /admin/pause - Pause the game engine (AI proactive loop)
   */
  app.post('/admin/pause', async (_req, res) => {
    try {
      await gameEngine.pause();
      res.json({ success: true, paused: true });
    } catch (error) {
      console.error('Failed to pause game engine:', error);
      res.status(500).json({ error: 'Failed to pause game engine' });
    }
  });

  /**
   * POST /admin/resume - Resume the game engine (AI proactive loop)
   */
  app.post('/admin/resume', async (_req, res) => {
    try {
      await gameEngine.resume();
      res.json({ success: true, paused: false });
    } catch (error) {
      console.error('Failed to resume game engine:', error);
      res.status(500).json({ error: 'Failed to resume game engine' });
    }
  });

  /**
   * GET /admin/status - Get current game engine status
   */
  app.get('/admin/status', (_req, res) => {
    try {
      const paused = gameEngine.isPaused();
      res.json({ paused });
    } catch (error) {
      console.error('Failed to get game engine status:', error);
      res.status(500).json({ error: 'Failed to get status' });
    }
  });
}
