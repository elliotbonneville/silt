import type { Character } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as charRepo from '../../../database/character-repository.js';
import { CharacterSchema } from '../../../database/generated/index.js';
import type { CommandContext } from '../../commands.js';
import { listeningManager } from '../../listening-manager.js';
import { executeListenCommand } from '../../observation-commands.js';
import {
  executeSayCommand,
  executeShoutCommand,
  executeTellCommand,
  executeWhisperCommand,
} from '../../social-commands.js';
import type { ICombatSystem } from '../../systems/combat-system.js';

vi.mock('../../../database/character-repository.js');

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
    speed: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    diedAt: null,
    ...overrides,
  });
}

describe('Social Commands', () => {
  const mockRoomId = createCuid('room');
  const mockCtx: CommandContext = {
    character: createMockCharacter({
      id: createCuid('player'),
      name: 'Player',
      currentRoomId: mockRoomId,
    }),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    listeningManager['listeningMap'].clear();
  });

  describe('executeSayCommand', () => {
    it('should create speech event', () => {
      const result = executeSayCommand(mockCtx, 'Hello world');

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('speech');
      expect(result.events[0].data?.message).toBe('Hello world');
      expect(result.events[0].visibility).toBe('room');
    });

    it('should fail with empty message', () => {
      const result = executeSayCommand(mockCtx, '   ');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Say what?');
    });
  });

  describe('executeShoutCommand', () => {
    it('should create shout event', () => {
      const result = executeShoutCommand(mockCtx, 'LOUD NOISES');

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('shout');
      expect(result.events[0].data?.message).toBe('LOUD NOISES');
      expect(result.events[0].visibility).toBe('room');
    });
  });

  describe('executeTellCommand', () => {
    it('should create tell event when target exists', async () => {
      const mockTarget = createMockCharacter({
        id: createCuid('target'),
        name: 'Target',
        currentRoomId: mockRoomId,
      });

      vi.mocked(charRepo.findCharactersInRoom).mockResolvedValue([mockTarget, mockCtx.character]);

      const result = await executeTellCommand(mockCtx, 'Target Secret plan');

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('tell');
      expect(result.events[0].data?.message).toBe('Secret plan');
      expect(result.events[0].data?.targetId).toBe(mockTarget.id);
      expect(result.events[0].visibility).toBe('room'); // Visible but obfuscated
    });

    it('should fail if target not found', async () => {
      vi.mocked(charRepo.findCharactersInRoom).mockResolvedValue([mockCtx.character]);

      const result = await executeTellCommand(mockCtx, 'Ghost Hello');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tell who?');
    });

    it('should fail if target is self', async () => {
      vi.mocked(charRepo.findCharactersInRoom).mockResolvedValue([mockCtx.character]);

      const result = await executeTellCommand(mockCtx, 'Player Hello');

      expect(result.success).toBe(false);
      expect(result.error).toContain('yourself');
    });
  });

  describe('executeWhisperCommand', () => {
    it('should create private whisper event', async () => {
      const mockTarget = createMockCharacter({
        id: createCuid('target'),
        name: 'Target',
        currentRoomId: mockRoomId,
      });

      vi.mocked(charRepo.findCharactersInRoom).mockResolvedValue([mockTarget, mockCtx.character]);

      const result = await executeWhisperCommand(mockCtx, 'Target Super secret');

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('whisper');
      expect(result.events[0].data?.message).toBe('Super secret');
      expect(result.events[0].visibility).toBe('private');
    });
  });
});

describe('Listening System', () => {
  const mockRoomId = createCuid('room');
  const mockCtx: CommandContext = {
    character: createMockCharacter({
      id: createCuid('player'),
      name: 'Player',
      currentRoomId: mockRoomId,
    }),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    listeningManager['listeningMap'].clear();
  });

  describe('executeListenCommand', () => {
    it('should start listening to a target', async () => {
      const mockTarget = createMockCharacter({
        id: createCuid('target'),
        name: 'Target',
        currentRoomId: mockRoomId,
      });

      vi.mocked(charRepo.findCharacterInRoom).mockResolvedValue(mockTarget);

      const result = await executeListenCommand(mockCtx, 'Target');

      expect(result.success).toBe(true);
      expect(result.output?.text).toContain('focus your attention on Target');
      expect(listeningManager.isListeningTo(mockCtx.character.id, mockTarget.id)).toBe(true);
    });

    it('should stop listening with "stop" argument', async () => {
      // Setup: start listening first
      listeningManager.startListening(mockCtx.character.id, 'some-id');

      const result = await executeListenCommand(mockCtx, 'stop');

      expect(result.success).toBe(true);
      expect(result.output?.text).toContain('stop listening');
      expect(listeningManager.getListeningTarget(mockCtx.character.id)).toBeUndefined();
    });

    it('should fail if target not found', async () => {
      vi.mocked(charRepo.findCharacterInRoom).mockResolvedValue(null);

      const result = await executeListenCommand(mockCtx, 'Ghost');

      expect(result.success).toBe(false);
      expect(result.error).toContain("don't see");
    });

    it('should fail if character is in combat', async () => {
      const mockTarget = createMockCharacter({
        id: createCuid('target'),
        name: 'Target',
        currentRoomId: mockRoomId,
      });

      vi.mocked(charRepo.findCharacterInRoom).mockResolvedValue(mockTarget);

      const mockCombatSystem: ICombatSystem = {
        isInCombat: vi.fn().mockReturnValue(true),
        startCombat: vi.fn(),
        stopCombat: vi.fn(),
        flee: vi.fn(),
        onTick: vi.fn(),
      };

      const ctxWithCombat: CommandContext = {
        ...mockCtx,
        combatSystem: mockCombatSystem,
      };

      const result = await executeListenCommand(ctxWithCombat, 'Target');

      expect(result.success).toBe(false);
      expect(result.error).toContain("can't focus on listening while fighting");
    });
  });
});
