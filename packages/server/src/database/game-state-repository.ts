/**
 * GameState repository - global game configuration
 */

import type { GameState } from '@prisma/client';
import { prisma } from './client.js';

const SINGLETON_ID = 'singleton';

/**
 * Get or create the game state singleton
 */
export async function getGameState(): Promise<GameState> {
  let gameState = await prisma.gameState.findUnique({
    where: { id: SINGLETON_ID },
  });

  if (!gameState) {
    gameState = await prisma.gameState.create({
      data: { id: SINGLETON_ID },
    });
  }

  return gameState;
}

/**
 * Update game state
 */
export async function updateGameState(data: { readonly isPaused?: boolean }): Promise<GameState> {
  return await prisma.gameState.upsert({
    where: { id: SINGLETON_ID },
    update: data,
    create: { id: SINGLETON_ID, ...data },
  });
}
