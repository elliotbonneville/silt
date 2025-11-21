/**
 * Combat attack execution logic
 */

import { findCharacterById, updateCharacter } from '../../database/character-repository.js';
import { createEvent } from '../create-game-event.js';
import type { EventPropagator } from '../event-propagator.js';
import { handleDeath } from './combat-death-handler.js';

interface CombatantState {
  characterId: string;
  targetId: string;
  gauge: number;
  speed: number;
}

/**
 * Resolve a single attack round
 */
export async function executeAttack(
  state: CombatantState,
  eventPropagator: EventPropagator,
  stopCombatForId: (id: string) => void,
  getAllCombatants: () => Map<string, { targetId: string }>,
): Promise<void> {
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
    stopCombatForId(state.characterId);
    return;
  }

  // Calculate damage
  const baseDamage = attacker.attackPower - target.defense;
  const damage = Math.max(1, baseDamage); // Minimum 1 damage

  // Apply damage
  const newHp = Math.max(0, target.hp - damage);
  await updateCharacter(target.id, { hp: newHp });

  // Broadcast Hit
  await eventPropagator.broadcast(
    createEvent(
      'combat_hit',
      attacker.currentRoomId,
      'room',
      {
        actorId: attacker.id,
        actorName: attacker.name,
        targetId: target.id,
        targetName: target.name,
        damage,
        targetHp: newHp,
        targetMaxHp: target.maxHp,
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

  // Handle Death
  if (newHp === 0) {
    await handleDeath(attacker, target, eventPropagator, stopCombatForId, getAllCombatants);
  } else {
    // Update last action timestamp
    await updateCharacter(attacker.id, { lastActionAt: new Date() });
  }
}
