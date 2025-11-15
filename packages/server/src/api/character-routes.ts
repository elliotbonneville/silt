/**
 * REST API routes for character management
 */

import type { Request, Response, Router } from 'express';
import { findCharactersByAccountId } from '../database/index.js';
import type { CharacterManager } from '../game/character-manager.js';
import { CreateCharacterRequestSchema } from './schemas.js';

export function setupCharacterRoutes(router: Router, characterManager: CharacterManager): void {
  /**
   * GET /api/accounts/:username/characters
   * List all characters for an account
   */
  router.get('/api/accounts/:username/characters', async (req: Request, res: Response) => {
    try {
      const username = req.params['username'];
      if (!username) {
        res.status(400).json({ success: false, error: 'Username is required' });
        return;
      }

      const characters = await findCharactersByAccountId(username);

      res.json({
        success: true,
        characters: characters.map((char) => ({
          id: char.id,
          name: char.name,
          isAlive: char.isAlive,
          hp: char.hp,
          maxHp: char.maxHp,
          createdAt: char.createdAt.toISOString(),
          diedAt: char.diedAt?.toISOString(),
        })),
      });
    } catch (error) {
      console.error('Failed to list characters:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load characters',
      });
    }
  });

  /**
   * POST /api/accounts/:username/characters
   * Create a new character for an account
   */
  router.post('/api/accounts/:username/characters', async (req: Request, res: Response) => {
    try {
      const username = req.params['username'];
      if (!username) {
        res.status(400).json({ success: false, error: 'Username is required' });
        return;
      }

      // Validate request body with Zod
      const parseResult = CreateCharacterRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: parseResult.error.issues[0]?.message || 'Invalid request',
        });
        return;
      }

      const { name } = parseResult.data;
      const character = await characterManager.createNewCharacter(username, name);

      res.status(201).json({
        success: true,
        character: {
          id: character.id,
          name: character.name,
          isAlive: character.isAlive,
          hp: character.hp,
          maxHp: character.maxHp,
          createdAt: character.createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to create character:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create character',
      });
    }
  });

  /**
   * GET /api/characters/:id
   * Get character details
   */
  router.get('/api/characters/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params['id'];
      if (!id) {
        res.status(400).json({ success: false, error: 'Character ID is required' });
        return;
      }

      const character = characterManager.getCharacter(id);

      if (!character) {
        res.status(404).json({
          success: false,
          error: 'Character not found',
        });
        return;
      }

      res.json({
        success: true,
        character: {
          id: character.id,
          name: character.name,
          isAlive: character.isAlive,
          hp: character.hp,
          maxHp: character.maxHp,
          currentRoomId: character.currentRoomId,
          attackPower: character.attackPower,
          defense: character.defense,
        },
      });
    } catch (error) {
      console.error('Failed to get character:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get character',
      });
    }
  });
}
