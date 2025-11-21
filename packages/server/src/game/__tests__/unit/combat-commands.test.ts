import type { Character } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as charRepo from '../../../database/character-repository.js';
import { CharacterSchema } from '../../../database/generated/index.js';
import { executeAttackCommand, executeStopCommand } from '../../combat-commands.js';
import type { CommandContext } from '../../commands.js';
import { listeningManager } from '../../listening-manager.js';
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
    speed: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    diedAt: null,
    ...overrides,
  });
}

describe('Combat Commands', () => {
  const mockRoomId = createCuid('room');
  let mockCtx: CommandContext;
  let mockStartCombat: ReturnType<typeof vi.fn>;
  let mockStopCombat: ReturnType<typeof vi.fn>;
  let mockIsInCombat: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Clean up listening state
    const playerId = createCuid('player');
    listeningManager.stopListening(playerId);

    mockStartCombat = vi.fn();
    mockStopCombat = vi.fn().mockReturnValue(false);
    mockIsInCombat = vi.fn().mockReturnValue(false);

    const mockCombatSystem: ICombatSystem = {
      startCombat: mockStartCombat,
      stopCombat: mockStopCombat,
      isInCombat: mockIsInCombat,
      flee: vi.fn(),
      onTick: vi.fn(),
    };

    mockCtx = {
      character: createMockCharacter({
        id: playerId,
        name: 'Player',
        currentRoomId: mockRoomId,
      }),
      combatSystem: mockCombatSystem,
    };
  });

  describe('executeAttackCommand', () => {
    it('should fail if character is listening', async () => {
      const mockTarget = createMockCharacter({
        id: createCuid('target'),
        name: 'Target',
        currentRoomId: mockRoomId,
      });

      vi.mocked(charRepo.findCharacterInRoom).mockResolvedValue(mockTarget);

      // Start listening
      listeningManager.startListening(mockCtx.character.id, 'some-target-id');

      const result = await executeAttackCommand(mockCtx, 'Target');

      expect(result.success).toBe(false);
      expect(result.error).toContain("can't fight while trying to eavesdrop");
      expect(mockStartCombat).not.toHaveBeenCalled();
    });

    it('should succeed if not listening', async () => {
      const mockTarget = createMockCharacter({
        id: createCuid('target'),
        name: 'Target',
        currentRoomId: mockRoomId,
      });

      vi.mocked(charRepo.findCharacterInRoom).mockResolvedValue(mockTarget);

      const result = await executeAttackCommand(mockCtx, 'Target');

      expect(result.success).toBe(true);
      expect(mockStartCombat).toHaveBeenCalledWith(mockCtx.character.id, mockTarget.id);
    });
  });

  describe('executeStopCommand', () => {
    it('should stop both combat and listening', async () => {
      // Setup: in combat and listening
      mockStopCombat.mockReturnValue(true);
      listeningManager.startListening(mockCtx.character.id, 'some-target-id');

      const result = await executeStopCommand(mockCtx);

      expect(result.success).toBe(true);
      expect(result.output?.text).toContain('stop fighting and listening');
      expect(mockStopCombat).toHaveBeenCalledWith(mockCtx.character.id);
      expect(listeningManager.getListeningTarget(mockCtx.character.id)).toBeUndefined();
    });

    it('should stop only combat', async () => {
      // Setup: in combat but not listening
      mockStopCombat.mockReturnValue(true);

      const result = await executeStopCommand(mockCtx);

      expect(result.success).toBe(true);
      expect(result.output?.text).toBe('You stop fighting.');
    });

    it('should stop only listening', async () => {
      // Setup: not in combat but listening
      mockStopCombat.mockReturnValue(false);
      listeningManager.startListening(mockCtx.character.id, 'some-target-id');

      const result = await executeStopCommand(mockCtx);

      expect(result.success).toBe(true);
      expect(result.output?.text).toContain('stop listening');
      expect(listeningManager.getListeningTarget(mockCtx.character.id)).toBeUndefined();
    });

    it('should fail if not in combat or listening', async () => {
      // Setup: neither in combat nor listening
      mockStopCombat.mockReturnValue(false);

      const result = await executeStopCommand(mockCtx);

      expect(result.success).toBe(false);
      expect(result.error).toContain("aren't fighting or listening");
    });
  });
});
