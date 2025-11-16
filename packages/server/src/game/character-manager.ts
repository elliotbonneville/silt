/**
 * Character manager - handles character lifecycle and database persistence
 */

import type { Character } from '@prisma/client';
import type { CharacterListItem } from '@silt/shared';
import type { Server } from 'socket.io';
import {
  createCharacter,
  deleteCharacter,
  findCharacterById,
  findCharactersByAccountId,
  findOrCreateAccount,
  updateCharacter,
} from '../database/index.js';
import { createPlayerSession, type PlayerSession } from './player.js';
import type { World } from './world.js';

export class CharacterManager {
  private readonly activeCharacters = new Map<string, Character>();
  private readonly playerSessions = new Map<string, PlayerSession>();

  constructor(
    private readonly world: World,
    private readonly io?: Server,
  ) {}

  /**
   * Load NPC characters into active memory (called on server start)
   */
  async loadNPCs(): Promise<Character[]> {
    const { prisma } = await import('../database/client.js');

    // Find all characters without an accountId (NPCs)
    const npcs = await prisma.character.findMany({
      where: {
        accountId: null,
        isAlive: true,
      },
    });

    for (const npc of npcs) {
      this.activeCharacters.set(npc.id, npc);
    }

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
    const spawnPointId = await this.world.getDefaultSpawnPointId();

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

    // Load character into active memory
    this.activeCharacters.set(characterId, character);

    return character;
  }

  /**
   * Disconnect a player and save character state
   */
  async disconnectPlayer(socketId: string): Promise<Character | null> {
    const session = this.playerSessions.get(socketId);
    if (!session) return null;

    const character = this.activeCharacters.get(session.characterId);
    if (!character) return null;

    // Save character state to database
    await updateCharacter(character.id, {
      currentRoomId: character.currentRoomId,
      hp: character.hp,
      maxHp: character.maxHp,
      attackPower: character.attackPower,
      defense: character.defense,
      isAlive: character.isAlive,
      lastActionAt: new Date(),
    });

    this.activeCharacters.delete(session.characterId);
    this.playerSessions.delete(socketId);

    return character;
  }

  /**
   * Get character by socket ID
   */
  getCharacterBySocketId(socketId: string): Character | undefined {
    const session = this.playerSessions.get(socketId);
    if (!session) return undefined;
    return this.activeCharacters.get(session.characterId);
  }

  /**
   * Get character by ID
   */
  getCharacter(characterId: string): Character | undefined {
    return this.activeCharacters.get(characterId);
  }

  /**
   * Get character in a room by name
   */
  getCharacterInRoom(roomId: string, name: string): Character | undefined {
    for (const character of this.activeCharacters.values()) {
      if (
        character.currentRoomId === roomId &&
        character.name.toLowerCase() === name.toLowerCase()
      ) {
        return character;
      }
    }
    return undefined;
  }

  /**
   * Get all characters in a room
   */
  getCharactersInRoom(roomId: string): Character[] {
    return Array.from(this.activeCharacters.values()).filter(
      (char) => char.currentRoomId === roomId,
    );
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
  sendCharacterUpdate(characterId: string): void {
    if (!this.io) return;

    const character = this.getCharacter(characterId);
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

    // Remove from active characters if loaded
    this.activeCharacters.delete(characterId);

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
