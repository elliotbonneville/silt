import { GAME_CONSTANTS } from '@silt/shared';
import { findCharacterById, updateCharacter } from '../../database/character-repository.js';
import {
  createItem,
  findItemsInInventory,
  moveItemToRoom,
} from '../../database/item-repository.js';
import { findRoomById } from '../../database/room-repository.js';
import { createEvent } from '../create-game-event.js';
import type { EventPropagator } from '../event-propagator.js';
import { transformRoom } from '../room-formatter.js';
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

export class CombatSystem implements GameSystem {
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
      createEvent('combat_start', attacker.currentRoomId, 'room', {
        actorId: attacker.id,
        actorName: attacker.name,
        targetId: targetId,
        targetName: target.name,
        message: `${attacker.name} attacks ${target.name}!`,
      }),
    );
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

    // Chance to flee
    const success = Math.random() < GAME_CONSTANTS.COMBAT.FLEE_SUCCESS_RATE;

    if (!success) {
      return {
        success: false,
        message: 'You try to flee but fail!',
      };
    }

    // Stop combat locally
    this.stopCombat(characterId);

    // Find character to get current room
    const character = await findCharacterById(characterId);
    if (!character) {
      return { success: false, message: 'Character not found.' };
    }

    // Find a random exit
    const room = await findRoomById(character.currentRoomId);
    if (!room) {
      return { success: false, message: 'Nowhere to flee!' };
    }

    const transformedRoom = transformRoom(room);
    const directions = Array.from(transformedRoom.exits.keys());

    if (directions.length === 0) {
      return {
        success: false,
        message: 'You break off combat, but there is nowhere to run!',
      };
    }

    const randomDirection = directions[Math.floor(Math.random() * directions.length)];
    if (!randomDirection) {
      return { success: false, message: 'Error finding exit.' };
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

    // Clone keys to allow modification during iteration (though we only delete dead)
    const activeIds = Array.from(this.combatants.keys());

    for (const id of activeIds) {
      const state = this.combatants.get(id);
      if (!state) continue;

      // Increment gauge (speed per tick)
      // Speed 10 = 100 in 10 ticks (1 sec)
      state.gauge += state.speed;

      if (state.gauge >= 100) {
        // Execute Attack
        await this.executeAttack(state);
        // Reset gauge (keep overflow)
        state.gauge -= 100;
      }
    }
  }

  /**
   * Resolve a single attack round
   */
  private async executeAttack(state: CombatantState): Promise<void> {
    const attacker = await findCharacterById(state.characterId);
    const target = await findCharacterById(state.targetId);

    // Validation: If anyone missing/dead/different room, stop combat
    if (
      !attacker ||
      !target ||
      !attacker.isAlive ||
      !target.isAlive ||
      attacker.currentRoomId !== target.currentRoomId
    ) {
      this.stopCombat(state.characterId);
      return;
    }

    // Calculate damage
    const baseDamage = attacker.attackPower - target.defense;
    const damage = Math.max(1, baseDamage); // Minimum 1 damage

    // Apply damage
    const newHp = Math.max(0, target.hp - damage);
    await updateCharacter(target.id, { hp: newHp });

    // Broadcast Hit
    await this.eventPropagator.broadcast(
      createEvent('combat_hit', attacker.currentRoomId, 'room', {
        actorId: attacker.id,
        actorName: attacker.name,
        targetId: target.id,
        targetName: target.name,
        damage,
        targetHp: newHp,
        targetMaxHp: target.maxHp,
      }),
    );

    // Handle Death
    if (newHp === 0) {
      await this.handleDeath(attacker, target);
    } else {
      // Update last action timestamp to keep "active" state fresh in DB
      // This helps AI know it's in combat via the old mechanism if strictly needed,
      // but mainly purely for "last seen" logic.
      await updateCharacter(attacker.id, { lastActionAt: new Date() });
    }
  }

  /**
   * Handle death logic (loot drop, corpse creation, combat ending)
   */
  private async handleDeath(
    attacker: { id: string; name: string; currentRoomId: string },
    target: { id: string; name: string },
  ): Promise<void> {
    await updateCharacter(target.id, {
      isAlive: false,
      isDead: true,
      diedAt: new Date(),
    });

    // Stop target from fighting
    this.stopCombat(target.id);

    // Stop anyone fighting the target (they won, combat ends for them)
    for (const [id, state] of this.combatants.entries()) {
      if (state.targetId === target.id) {
        this.stopCombat(id);
      }
    }

    // Drop inventory
    const inventory = await findItemsInInventory(target.id);
    for (const item of inventory) {
      await moveItemToRoom(item.id, attacker.currentRoomId);
    }

    // Create corpse
    const itemNames = inventory.map((i) => i.name).join(', ');
    const corpseDescription =
      inventory.length > 0
        ? `The lifeless body of ${target.name}. You can see: ${itemNames}.`
        : `The lifeless body of ${target.name}.`;

    await createItem({
      name: `${target.name}'s corpse`,
      description: corpseDescription,
      itemType: 'misc',
      roomId: attacker.currentRoomId,
    });

    // Broadcast Death
    await this.eventPropagator.broadcast(
      createEvent('death', attacker.currentRoomId, 'room', {
        victimId: target.id,
        victimName: target.name,
        killerId: attacker.id,
        killerName: attacker.name,
        itemsDropped: inventory.length,
      }),
    );
  }
}
