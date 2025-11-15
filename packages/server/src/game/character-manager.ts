/**
 * Character manager - handles character lifecycle and database persistence
 */

import type { Character } from '@prisma/client';
import type { CharacterListItem } from '@silt/shared';
import {
  createCharacter,
  findCharacterById,
  findCharactersByAccountId,
  updateCharacter,
} from '../database/index.js';
import { createPlayerSession, type PlayerSession } from './player.js';
import type { World } from './world.js';

export class CharacterManager {
  private readonly activeCharacters = new Map<string, Character>();
  private readonly playerSessions = new Map<string, PlayerSession>();

  constructor(private readonly world: World) {}

  /**
   * Get characters for an account
   */
  async getCharactersForAccount(accountId: string): Promise<CharacterListItem[]> {
    const characters = await findCharactersByAccountId(accountId);
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
   * Create a new character
   */
  async createNewCharacter(accountId: string, name: string): Promise<Character> {
    const startingRoomId = this.world.getStartingRoomId();

    const character = await createCharacter({
      name,
      accountId,
      spawnRoomId: startingRoomId,
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
}
