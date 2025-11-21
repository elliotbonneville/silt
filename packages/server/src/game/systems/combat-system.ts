import { GAME_CONSTANTS } from '@silt/shared';
import { findCharacterById } from '../../database/character-repository.js';
import { findRoomById } from '../../database/room-repository.js';
import { createEvent } from '../create-game-event.js';
import type { EventPropagator } from '../event-propagator.js';
import { transformRoom } from '../room-formatter.js';
import { executeAttack } from './combat-attack-handler.js';
import type { GameSystem, TickContext } from './game-loop.js';

interface CombatantState {
  characterId: string;
  targetId: string;
  gauge: number;
  speed: number;
}

export interface FleeResult {
  readonly success: boolean;
  readonly message: string;
  readonly direction?: string;
}

export interface ICombatSystem extends GameSystem {
  startCombat(attackerId: string, targetId: string): Promise<void>;
  isInCombat(characterId: string): boolean;
  stopCombat(characterId: string): boolean;
  flee(characterId: string): Promise<FleeResult>;
}

export class CombatSystem implements ICombatSystem {
  private combatants = new Map<string, CombatantState>();

  constructor(private readonly eventPropagator: EventPropagator) {}

  /**
   * Start combat between attacker and target
   */
  async startCombat(attackerId: string, targetId: string): Promise<void> {
    // Fetch attacker details for speed
    const attacker = await findCharacterById(attackerId);
    // Need target name for the message
    const target = await findCharacterById(targetId);
    if (!attacker || !attacker.isAlive || !target) return;

    const existing = this.combatants.get(attackerId);
    if (existing) {
      // Switching target
      existing.targetId = targetId;
      return;
    }

    // Initialize combat state
    this.combatants.set(attackerId, {
      characterId: attackerId,
      targetId: targetId,
      gauge: 0,
      speed: attacker.speed || 5, // Default if null/0
    });

    // Announce combat start (visual only, mechanic starts next tick)
    await this.eventPropagator.broadcast(
      createEvent(
        'combat_start',
        attacker.currentRoomId,
        'room',
        {
          actorId: attacker.id,
          actorName: attacker.name,
          targetId: targetId,
          targetName: target.name,
          message: `${attacker.name} attacks ${target.name}!`,
        },
        [
          {
            id: attacker.id,
            name: attacker.name,
            type: 'character',
          },
          {
            id: target.id,
            name: target.name,
            type: 'character',
          },
        ],
      ),
    );
  }

  /**
   * Check if a character is in combat
   */
  isInCombat(characterId: string): boolean {
    return this.combatants.has(characterId);
  }

  /**
   * Stop combat for a character
   */
  stopCombat(characterId: string): boolean {
    return this.combatants.delete(characterId);
  }

  /**
   * Attempt to flee from combat
   */
  async flee(characterId: string): Promise<FleeResult> {
    // Check if actually in combat
    if (!this.combatants.has(characterId)) {
      return { success: false, message: "You aren't in combat." };
    }

    // Flee chance = 70% base
    const fleeChance = GAME_CONSTANTS.COMBAT.FLEE_SUCCESS_RATE;
    const roll = Math.random();

    // Failed to flee
    if (roll > fleeChance) {
      return { success: false, message: 'You fail to escape!' };
    }

    // Flee succeeded
    this.stopCombat(characterId);

    // Find character to get current room
    const character = await findCharacterById(characterId);
    if (!character) {
      return { success: false, message: 'Character not found.' };
    }

    // Find a random exit
    const room = await findRoomById(character.currentRoomId);
    if (!room) {
      return { success: false, message: 'Room not found.' };
    }

    const roomData = transformRoom(room);
    if (roomData.exits.size === 0) {
      // Nowhere to flee to (trapped room)
      return { success: false, message: 'There is nowhere to run!' };
    }

    // Pick random exit
    const exitDirections = Array.from(roomData.exits.keys());
    const randomDirection = exitDirections[Math.floor(Math.random() * exitDirections.length)];
    if (!randomDirection) {
      return { success: false, message: 'Failed to find exit.' };
    }

    return {
      success: true,
      message: `You flee ${randomDirection}!`,
      direction: randomDirection,
    };
  }

  /**
   * Game Loop Tick
   * Increments gauges and executes attacks
   */
  async onTick(_context: TickContext): Promise<void> {
    if (this.combatants.size === 0) return;

    // Clone keys to allow modification during iteration
    const activeIds = Array.from(this.combatants.keys());

    for (const id of activeIds) {
      const state = this.combatants.get(id);
      if (!state) continue;

      // Increment gauge (speed per tick)
      state.gauge += state.speed;

      if (state.gauge >= 100) {
        // Execute Attack
        await executeAttack(
          state,
          this.eventPropagator,
          (charId) => this.stopCombat(charId),
          () => this.combatants,
        );
        // Reset gauge (keep overflow)
        state.gauge -= 100;
      }
    }
  }
}
