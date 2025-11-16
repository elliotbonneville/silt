/**
 * Character manager - handles character lifecycle and database persistence
 */

import type { Character } from '@prisma/client';
import type { CharacterListItem } from '@silt/shared';
import type { Server } from 'socket.io';
import { prisma } from '../database/client.js';
import {
  createCharacter,
  deleteCharacter,
  findCharacterById,
  findCharactersByAccountId,
  findOrCreateAccount,
} from '../database/index.js';
import { getDefaultSpawnPointId } from '../database/item-repository.js';
import { createPlayerSession, type PlayerSession } from './player.js';

export class CharacterManager {
  private readonly playerSessions = new Map<string, PlayerSession>();

  constructor(private readonly io?: Server) {}

  /**
   * Load NPC characters (called on server start)
   * Returns NPCs but does not cache them
   */
  async loadNPCs(): Promise<Character[]> {
    // Find all characters without an accountId (NPCs)
    const npcs = await prisma.character.findMany({
      where: {
        accountId: null,
        isAlive: true,
      },
    });

    return npcs;
  }

  /**
   * Get characters for a username
   * Creates account if it doesn't exist
   */
  async getCharactersForUsername(username: string): Promise<CharacterListItem[]> {
    const account = await findOrCreateAccount(username);
    const characters = await findCharactersByAccountId(account.id);

    return characters.map((char): CharacterListItem => {
      const item: CharacterListItem = {
        id: char.id,
        name: char.name,
        isAlive: char.isAlive,
        hp: char.hp,
        maxHp: char.maxHp,
        createdAt: char.createdAt.toISOString(),
      };
      if (char.diedAt) {
        return { ...item, diedAt: char.diedAt.toISOString() };
      }
      return item;
    });
  }

  /**
   * Create a new character for a username
   */
  async createNewCharacter(username: string, name: string): Promise<Character> {
    const account = await findOrCreateAccount(username);
    const spawnPointId = await getDefaultSpawnPointId();

    const character = await createCharacter({
      name,
      accountId: account.id,
      spawnPointId,
    });

    return character;
  }

  /**
   * Connect a player to an existing character
   */
  async connectPlayer(socketId: string, characterId: string): Promise<Character> {
    const character = await findCharacterById(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    if (!character.isAlive) {
      throw new Error('Cannot play as a dead character');
    }

    // Create player session
    const session = createPlayerSession(socketId, characterId);
    this.playerSessions.set(socketId, session);

    return character;
  }

  /**
   * Disconnect a player
   */
  async disconnectPlayer(socketId: string): Promise<Character | null> {
    const session = this.playerSessions.get(socketId);
    if (!session) return null;

    const character = await findCharacterById(session.characterId);
    if (!character) return null;

    this.playerSessions.delete(socketId);

    return character;
  }

  /**
   * Get character by socket ID (queries Prisma)
   */
  async getCharacterBySocketId(socketId: string): Promise<Character | null> {
    const session = this.playerSessions.get(socketId);
    if (!session) return null;
    return await findCharacterById(session.characterId);
  }

  /**
   * Get socket ID for a character
   */
  getSocketIdForCharacter(characterId: string): string | undefined {
    for (const [socketId, session] of this.playerSessions.entries()) {
      if (session.characterId === characterId) {
        return socketId;
      }
    }
    return undefined;
  }

  /**
   * Send character stat update to client
   */
  async sendCharacterUpdate(characterId: string): Promise<void> {
    if (!this.io) return;

    const character = await findCharacterById(characterId);
    const socketId = this.getSocketIdForCharacter(characterId);

    if (character && socketId) {
      this.io.to(socketId).emit('character:update', {
        hp: character.hp,
        maxHp: character.maxHp,
        attackPower: character.attackPower,
        defense: character.defense,
      });
    }
  }

  /**
   * Handle character death - notify and disconnect
   */
  async handleCharacterDeath(characterId: string): Promise<void> {
    if (!this.io) return;

    const socketId = this.getSocketIdForCharacter(characterId);
    if (!socketId) return;

    // Notify the player they died
    this.io.to(socketId).emit('game:death', {
      message: 'You have died! Your character is gone forever.',
    });

    // Disconnect after a short delay
    setTimeout(() => {
      if (this.io && socketId) {
        this.io.to(socketId).emit('game:disconnect', {
          reason: 'death',
        });
      }
    }, 3000);
  }

  /**
   * Retire (permanently delete) a character
   */
  async retireCharacter(characterId: string): Promise<void> {
    const character = await findCharacterById(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    // Remove player session if connected
    for (const [socketId, session] of this.playerSessions.entries()) {
      if (session.characterId === characterId) {
        this.playerSessions.delete(socketId);
      }
    }

    // Hard delete from database
    await deleteCharacter(characterId);
  }
}
