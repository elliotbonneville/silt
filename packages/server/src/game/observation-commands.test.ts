import type { Character, Item } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as charRepo from '../database/character-repository.js';
import { CharacterSchema, ItemSchema } from '../database/generated/index.js';
import * as itemRepo from '../database/item-repository.js';
import type { CommandContext } from './commands.js';
import { executeExamineCommand } from './observation-commands.js';

vi.mock('../database/item-repository.js');
vi.mock('../database/character-repository.js');

// Helper to create valid CUID-like strings for testing
const createCuid = (suffix: string) => `cjld2cjxh0000qzrmn831${suffix.padEnd(4, '0')}`;

function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return CharacterSchema.parse({
    id: overrides.id || createCuid('char'),
    name: 'Default Name',
    description: '',
    accountId: null,
    currentRoomId: createCuid('room'),
    spawnPointId: null,
    hp: 100,
    maxHp: 100,
    attackPower: 10,
    defense: 5,
    isAlive: true,
    isDead: false,
    lastActionAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    diedAt: null,
    ...overrides,
  });
}

function createMockItem(overrides: Partial<Item> = {}): Item {
  return ItemSchema.parse({
    id: overrides.id || createCuid('item'),
    name: 'Default Item',
    description: 'Default Description',
    itemType: 'misc',
    statsJson: '{}',
    roomId: null,
    characterId: null,
    isEquipped: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

describe('executeExamineCommand', () => {
  const mockCtx: CommandContext = {
    character: createMockCharacter({
      name: 'Player',
      hp: 100,
      maxHp: 100,
      attackPower: 10,
      defense: 5,
    }),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should examine item in inventory', async () => {
    const mockItem = createMockItem({
      name: 'Sword',
      description: 'A sharp sword.',
      itemType: 'weapon',
      isEquipped: false,
    });

    vi.mocked(itemRepo.findItemsInInventory).mockResolvedValue([mockItem]);
    vi.mocked(itemRepo.findItemsInRoom).mockResolvedValue([]);
    vi.mocked(itemRepo.getItemStats).mockReturnValue({ damage: 5 });

    const result = await executeExamineCommand(mockCtx, 'sword');

    expect(result.success).toBe(true);
    expect(result.output?.type).toBe('item_detail');
    expect(result.output?.text).toContain('Sword');
    expect(result.output?.text).toContain('Damage: +5');
  });

  it('should examine character in room with description', async () => {
    vi.mocked(itemRepo.findItemsInInventory).mockResolvedValue([]);
    vi.mocked(itemRepo.findItemsInRoom).mockResolvedValue([]);

    const mockTargetChar = createMockCharacter({
      name: 'Goblin',
      description: 'A nasty little creature.',
      hp: 20,
      maxHp: 20,
      attackPower: 5,
      defense: 2,
      currentRoomId: mockCtx.character.currentRoomId,
    });

    vi.mocked(charRepo.findCharacterInRoom).mockResolvedValue(mockTargetChar);
    // Mock findItemsInInventory specifically for the target character ID if called
    vi.mocked(itemRepo.findItemsInInventory).mockImplementation(async (charId) => {
      if (charId === mockTargetChar.id) return [];
      return [];
    });

    const result = await executeExamineCommand(mockCtx, 'goblin');

    expect(result.success).toBe(true);
    expect(result.output?.type).toBe('character_detail');
    expect(result.output?.text).toContain('Goblin');
    expect(result.output?.text).toContain('A nasty little creature.');
    expect(result.output?.text).toContain('Health: Perfect condition');
    expect(result.output?.text).toContain('Attack: 5');
  });

  it('should prioritize item over character', async () => {
    const mockItem = createMockItem({
      name: 'Goblin', // Item named Goblin (statue?)
      description: 'A small statue.',
      itemType: 'misc',
    });

    vi.mocked(itemRepo.findItemsInInventory).mockResolvedValue([mockItem]);
    vi.mocked(itemRepo.findItemsInRoom).mockResolvedValue([]);
    vi.mocked(itemRepo.getItemStats).mockReturnValue({});

    const mockTargetChar = createMockCharacter({
      name: 'Goblin',
    });
    vi.mocked(charRepo.findCharacterInRoom).mockResolvedValue(mockTargetChar);

    const result = await executeExamineCommand(mockCtx, 'goblin');

    expect(result.success).toBe(true);
    expect(result.output?.type).toBe('item_detail'); // Should be item
  });

  it('should return error if nothing found', async () => {
    vi.mocked(itemRepo.findItemsInInventory).mockResolvedValue([]);
    vi.mocked(itemRepo.findItemsInRoom).mockResolvedValue([]);
    vi.mocked(charRepo.findCharacterInRoom).mockResolvedValue(null);

    const result = await executeExamineCommand(mockCtx, 'ghost');

    expect(result.success).toBe(false);
    expect(result.error).toContain('don\'t see "ghost"');
  });
});
