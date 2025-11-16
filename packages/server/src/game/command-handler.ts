/**
 * Command Handler - processes commands and handles side effects
 */

import type { Character } from '@prisma/client';
import type { AIAgentManager } from './ai-agent-manager.js';
import type { CharacterManager } from './character-manager.js';
import type { CommandResult } from './commands.js';
import type { EventPropagator } from './event-propagator.js';

export class CommandHandler {
  constructor(
    private readonly characterManager: CharacterManager,
    private readonly aiAgentManager: AIAgentManager,
    private readonly eventPropagator: EventPropagator,
  ) {}

  /**
   * Process command results and handle side effects
   */
  async processResults(result: CommandResult, character: Character): Promise<void> {
    // Broadcast all events
    this.eventPropagator.broadcastMany(result.events);

    // Handle AI responses to speech
    await this.handleAIResponses(result, character);

    // Handle character stat updates
    this.handleStatUpdates(result, character);

    // Handle death
    await this.handleDeath(result);
  }

  /**
   * Handle AI agent responses to ANY events
   */
  private async handleAIResponses(result: CommandResult, character: Character): Promise<void> {
    const roomChars = this.characterManager.getCharactersInRoom(character.currentRoomId);

    // Process each event - AI sees EVERYTHING and decides what to react to
    for (const event of result.events) {
      // Skip private events (room descriptions, etc)
      if (event.visibility === 'private') continue;

      const aiResponses = await this.aiAgentManager.handleEvent(event, roomChars);

      // Delay responses slightly for natural pacing
      if (aiResponses.length > 0) {
        setTimeout(() => {
          this.eventPropagator.broadcastMany(aiResponses);
        }, 1000);
      }
    }
  }

  /**
   * Handle character stat updates
   */
  private handleStatUpdates(result: CommandResult, character: Character): void {
    const combatEvent = result.events.find((e) => e.type === 'combat_hit');
    const hasEquipment = result.events.some((e) => e.type === 'item_equip' || e.type === 'system');

    if (combatEvent || hasEquipment) {
      this.characterManager.sendCharacterUpdate(character.id);

      const targetId = combatEvent?.data?.['targetId'];
      if (typeof targetId === 'string') {
        this.characterManager.sendCharacterUpdate(targetId);
      }
    }
  }

  /**
   * Handle character death
   */
  private async handleDeath(result: CommandResult): Promise<void> {
    const victimId = result.events.find((e) => e.type === 'death')?.data?.['victimId'];
    if (typeof victimId === 'string') {
      await this.characterManager.handleCharacterDeath(victimId);
    }
  }
}
