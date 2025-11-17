/**
 * REST API routes for character management
 */

import type { FormattingPreferences } from '@silt/shared';
import type { Request, Response, Router } from 'express';
import {
  findAccountByUsername,
  findCharacterById,
  findCharactersByAccountId,
  getAccountPreferences,
  updateAccountPreferences,
} from '../database/index.js';
import type { CharacterManager } from '../game/character-manager.js';
import { CreateCharacterRequestSchema, UpdatePreferencesRequestSchema } from './schemas.js';

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

      // Look up account by username first
      const account = await findAccountByUsername(username);
      if (!account) {
        res.json({ success: true, characters: [] });
        return;
      }

      const characters = await findCharactersByAccountId(account.id);

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

      // Check character slot limit (5 alive characters max)
      const account = await findAccountByUsername(username);
      if (account) {
        const characters = await findCharactersByAccountId(account.id);
        const aliveCount = characters.filter((c) => c.isAlive).length;
        if (aliveCount >= 5) {
          res.status(400).json({
            success: false,
            error: 'Maximum character limit reached (5). Please retire a character first.',
          });
          return;
        }
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

      const character = await findCharacterById(id);

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

  /**
   * DELETE /api/characters/:id
   * Retire (soft delete) a character
   */
  router.delete('/api/characters/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params['id'];
      if (!id) {
        res.status(400).json({ success: false, error: 'Character ID is required' });
        return;
      }

      await characterManager.retireCharacter(id);

      res.json({
        success: true,
        message: 'Character retired successfully',
      });
    } catch (error) {
      console.error('Failed to retire character:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retire character',
      });
    }
  });

  /**
   * GET /api/accounts/:username/preferences
   * Get account formatting preferences
   */
  router.get('/api/accounts/:username/preferences', async (req: Request, res: Response) => {
    try {
      const username = req.params['username'];
      if (!username) {
        res.status(400).json({ success: false, error: 'Username is required' });
        return;
      }

      const account = await findAccountByUsername(username);
      if (!account) {
        res.status(404).json({ success: false, error: 'Account not found' });
        return;
      }

      const preferences = await getAccountPreferences(account.id);
      res.json({ success: true, preferences });
    } catch (error) {
      console.error('Failed to get preferences:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get preferences',
      });
    }
  });

  /**
   * PATCH /api/accounts/:username/preferences
   * Update account formatting preferences
   */
  router.patch('/api/accounts/:username/preferences', async (req: Request, res: Response) => {
    try {
      const username = req.params['username'];
      if (!username) {
        res.status(400).json({ success: false, error: 'Username is required' });
        return;
      }

      const parseResult = UpdatePreferencesRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: parseResult.error.issues[0]?.message || 'Invalid request',
        });
        return;
      }

      const account = await findAccountByUsername(username);
      if (!account) {
        res.status(404).json({ success: false, error: 'Account not found' });
        return;
      }

      // Filter out undefined values for exactOptionalPropertyTypes
      const updates: Partial<FormattingPreferences> = {};
      if (parseResult.data.themePreset !== undefined) {
        updates.themePreset = parseResult.data.themePreset;
      }
      if (parseResult.data.fontFamily !== undefined) {
        updates.fontFamily = parseResult.data.fontFamily;
      }
      if (parseResult.data.fontSize !== undefined) {
        updates.fontSize = parseResult.data.fontSize;
      }
      if (parseResult.data.lineWidth !== undefined) {
        updates.lineWidth = parseResult.data.lineWidth;
      }
      if (parseResult.data.customColors !== undefined) {
        updates.customColors = parseResult.data.customColors;
      }

      const preferences = await updateAccountPreferences(account.id, updates);
      res.json({ success: true, preferences });
    } catch (error) {
      console.error('Failed to update preferences:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update preferences',
      });
    }
  });
}
