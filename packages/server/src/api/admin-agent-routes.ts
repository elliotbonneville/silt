/**
 * Admin agent routes - AI agent management endpoints
 */

import type { Express } from 'express';
import { z } from 'zod';
import {
  createAIAgent,
  createCharacter,
  findAllAIAgents,
  findCharacterById,
  updateAIAgent,
  updateCharacter,
} from '../database/index.js';

const UpdateAIAgentSchema = z.object({
  systemPrompt: z.string().optional(),
  spatialMemory: z.string().optional(),
  description: z.string().optional(),
});

const CreateAIAgentSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  systemPrompt: z.string().min(10),
  homeRoomId: z.string(),
  currentRoomId: z.string(),
  maxRoomsFromHome: z.number().int().min(0).max(10).default(2),
  hp: z.number().int().min(1).max(500).default(100),
  maxHp: z.number().int().min(1).max(500).default(100),
  attackPower: z.number().int().min(1).max(100).default(10),
  defense: z.number().int().min(0).max(100).default(5),
});

export function setupAdminAgentRoutes(app: Express): void {
  /**
   * GET /admin/agents - Get all AI agents and their current state
   */
  app.get('/admin/agents', async (_req, res) => {
    try {
      const agents = await findAllAIAgents();

      const agentData = await Promise.all(
        agents.map(async (agent) => {
          const character = await findCharacterById(agent.characterId);

          // Parse JSON fields
          const relationships: unknown = JSON.parse(agent.relationshipsJson || '{}');
          const conversationHistory: unknown = JSON.parse(agent.conversationJson || '[]');

          return {
            id: agent.id,
            characterId: agent.characterId,
            characterName: character?.name || 'Unknown',
            description: character?.description || undefined,
            currentRoomId: character?.currentRoomId || 'unknown',
            isAlive: character?.isAlive || false,
            hp: character?.hp || 0,
            maxHp: character?.maxHp || 0,
            homeRoomId: agent.homeRoomId,
            maxRoomsFromHome: agent.maxRoomsFromHome,
            systemPrompt: agent.systemPrompt,
            spatialMemory: agent.spatialMemory,
            spatialMemoryUpdatedAt: agent.spatialMemoryUpdatedAt.toISOString(),
            relationships,
            conversationHistory,
            lastActionAt: agent.lastActionAt.toISOString(),
            createdAt: agent.createdAt.toISOString(),
            updatedAt: agent.updatedAt.toISOString(),
          };
        }),
      );

      res.json({ agents: agentData });
    } catch (error) {
      console.error('Failed to load agents:', error);
      res.status(500).json({ error: 'Failed to load agents' });
    }
  });

  /**
   * POST /admin/agents - Create a new AI agent
   */
  app.post('/admin/agents', async (req, res) => {
    try {
      const parseResult = CreateAIAgentSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({ error: 'Invalid request body', details: parseResult.error });
        return;
      }

      const {
        name,
        description,
        systemPrompt,
        homeRoomId,
        currentRoomId,
        maxRoomsFromHome,
        hp,
        maxHp,
        attackPower,
        defense,
      } = parseResult.data;

      // Create character first (NPCs have no account or spawn point)
      const character = await createCharacter({
        name,
        ...(description ? { description } : {}),
        currentRoomId,
        hp,
        maxHp,
        attackPower,
        defense,
      });

      // Create AI agent linked to the character
      const agent = await createAIAgent({
        characterId: character.id,
        systemPrompt,
        homeRoomId,
        maxRoomsFromHome,
      });

      res.json({
        success: true,
        agent: {
          id: agent.id,
          characterId: character.id,
          characterName: character.name,
          currentRoomId: character.currentRoomId,
          isAlive: character.isAlive,
          hp: character.hp,
          maxHp: character.maxHp,
          homeRoomId: agent.homeRoomId,
          maxRoomsFromHome: agent.maxRoomsFromHome,
          systemPrompt: agent.systemPrompt,
          spatialMemory: agent.spatialMemory,
          spatialMemoryUpdatedAt: agent.spatialMemoryUpdatedAt.toISOString(),
          relationships: {},
          conversationHistory: [],
          lastActionAt: agent.lastActionAt.toISOString(),
          createdAt: agent.createdAt.toISOString(),
          updatedAt: agent.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to create AI agent:', error);
      res.status(500).json({ error: 'Failed to create AI agent' });
    }
  });

  /**
   * PATCH /admin/agents/:id/character - Update character fields
   */
  app.patch('/admin/agents/:id/character', async (req, res) => {
    try {
      const agentId = req.params['id'];
      if (!agentId) {
        res.status(400).json({ error: 'Agent ID is required' });
        return;
      }

      const schema = z.object({
        description: z.string().optional(),
      });

      const parseResult = schema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ error: 'Invalid request body', details: parseResult.error });
        return;
      }

      const { description } = parseResult.data;
      const agents = await findAllAIAgents();
      const agent = agents.find((a) => a.id === agentId);

      if (!agent) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      if (description !== undefined) {
        await updateCharacter(agent.characterId, { description });
      }

      res.json({ success: true, message: 'Character updated successfully' });
    } catch (error) {
      console.error('Failed to update character:', error);
      res.status(500).json({ error: 'Failed to update character' });
    }
  });

  /**
   * PATCH /admin/agents/:id - Update AI agent fields
   */
  app.patch('/admin/agents/:id', async (req, res) => {
    try {
      const agentId = req.params['id'];
      if (!agentId) {
        res.status(400).json({ error: 'Agent ID is required' });
        return;
      }

      const parseResult = UpdateAIAgentSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({ error: 'Invalid request body', details: parseResult.error });
        return;
      }

      const { systemPrompt, spatialMemory, description } = parseResult.data;

      // Update character description if provided
      if (description !== undefined) {
        const agent = (await findAllAIAgents()).find((a) => a.id === agentId);
        if (agent) {
          await updateCharacter(agent.characterId, { description });
        }
      }

      const updates: {
        relationshipsJson?: string;
        conversationJson?: string;
        lastActionAt?: Date;
      } & Record<string, unknown> = {};

      if (systemPrompt !== undefined) {
        updates['systemPrompt'] = systemPrompt;
      }

      if (spatialMemory !== undefined) {
        updates['spatialMemory'] = spatialMemory;
        updates['spatialMemoryUpdatedAt'] = new Date();
      }

      if (Object.keys(updates).length > 0) {
        await updateAIAgent(agentId, updates);
      }

      res.json({ success: true, message: 'Agent updated successfully' });
    } catch (error) {
      console.error('Failed to update agent:', error);
      res.status(500).json({ error: 'Failed to update agent' });
    }
  });

  /**
   * POST /admin/agents/:id/regenerate-spatial-memory - Force regenerate spatial memory
   */
  app.post('/admin/agents/:id/regenerate-spatial-memory', async (req, res) => {
    try {
      const agentId = req.params['id'];
      if (!agentId) {
        res.status(400).json({ error: 'Agent ID is required' });
        return;
      }

      // Force regeneration by setting timestamp to old date
      const regenerateUpdate: Record<string, unknown> = {
        spatialMemoryUpdatedAt: new Date('2000-01-01'),
      };
      await updateAIAgent(agentId, regenerateUpdate);

      res.json({
        success: true,
        message: 'Spatial memory will regenerate on next background refresh (within 10 seconds)',
      });
    } catch (error) {
      console.error('Failed to trigger spatial memory regeneration:', error);
      res.status(500).json({ error: 'Failed to trigger regeneration' });
    }
  });
}
