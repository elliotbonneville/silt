/**
 * Command Handler - processes commands and handles side effects
 */

import type { Character } from '@prisma/client';
import type { CharacterManager } from './character-manager.js';
import type { CommandResult } from './commands.js';
import type { EventPropagator } from './event-propagator.js';

export class CommandHandler {
  constructor(
    private readonly characterManager: CharacterManager,
    private readonly eventPropagator: EventPropagator,
  ) {}

  /**
   * Process command results and handle side effects
   */
  async processResults(result: CommandResult, character: Character): Promise<void> {
    // Broadcast all events
    // Events are automatically queued for AI agents via EventPropagator
    // AI processes them in the unified proactive loop every 10 seconds
    await this.eventPropagator.broadcastMany(result.events);

    // Handle character stat updates
    await this.handleStatUpdates(result, character);

    // Handle death
    await this.handleDeath(result);
  }

  /**
   * Handle character stat updates
   */
  private async handleStatUpdates(result: CommandResult, character: Character): Promise<void> {
    const combatEvent = result.events.find((e) => e.type === 'combat_hit');
    const hasEquipment = result.events.some((e) => e.type === 'item_equip' || e.type === 'system');

    if (combatEvent || hasEquipment) {
      await this.characterManager.sendCharacterUpdate(character.id);

      const targetId = combatEvent?.data?.['targetId'];
      if (typeof targetId === 'string') {
        await this.characterManager.sendCharacterUpdate(targetId);
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
