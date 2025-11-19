/**
 * Command Processor - handles command execution and result processing
 */

import type { Character } from '@prisma/client';
import type { Server } from 'socket.io';
import { findCharacterById, updateCharacter } from '../database/character-repository.js';
import { createPlayerLog } from '../database/player-log-repository.js';
import type { AIAgentManager } from './ai-agent-manager.js';
import type { CharacterManager } from './character-manager.js';
import type { CommandHandler } from './command-handler.js';
import { type CommandContext, parseAndExecuteCommand } from './commands.js';
import type { CombatSystem } from './systems/combat-system.js';
import type { QueuedCommand } from './systems/command-queue.js';

export class CommandProcessor {
  constructor(
    private readonly io: Server,
    private readonly characterManager: CharacterManager,
    private readonly aiAgentManager: AIAgentManager,
    private readonly commandHandler: CommandHandler,
    private readonly combatSystem: CombatSystem,
  ) {}

  /**
   * Process a single command from the queue
   */
  async processCommand(cmd: QueuedCommand): Promise<void> {
    let character: Character | null = null;

    if (cmd.type === 'player') {
      const socketId = cmd.actorId;
      character = await this.characterManager.getCharacterBySocketId(socketId);
    } else {
      character = await findCharacterById(cmd.actorId);
    }

    if (!character) {
      console.warn(`Could not find character for ${cmd.type} command: ${cmd.actorId}`);
      return;
    }

    const socketId =
      cmd.type === 'player' ? this.characterManager.getSocketIdForCharacter(character.id) : null;

    const context: CommandContext = {
      character,
      combatSystem: this.combatSystem,
    };

    await createPlayerLog(character.id, 'command', cmd.commandText);

    const result = await parseAndExecuteCommand(cmd.commandText, context);

    if (!result.success && result.error) {
      if (socketId) {
        this.io.to(socketId).emit('game:error', { message: result.error });
      }
      await createPlayerLog(character.id, 'output', { type: 'error', message: result.error });
      return;
    }

    if (result.output) {
      if (socketId) {
        this.io.to(socketId).emit('game:output', result.output);
      } else {
        this.aiAgentManager.queueOutputForAgent(character.id, result.output);
      }
      await createPlayerLog(character.id, 'output', result.output);
    }

    const moveEvent = result.events.find((e) => e.type === 'movement');
    if (moveEvent?.data && this.isMovementData(moveEvent.data)) {
      await updateCharacter(character.id, { currentRoomId: moveEvent.data.toRoomId });
    }

    await this.commandHandler.processResults(result, character);
  }

  private isMovementData(
    data: Record<string, unknown>,
  ): data is { fromRoomId: string; toRoomId: string; direction: string } {
    return (
      typeof data['fromRoomId'] === 'string' &&
      typeof data['toRoomId'] === 'string' &&
      typeof data['direction'] === 'string'
    );
  }
}
