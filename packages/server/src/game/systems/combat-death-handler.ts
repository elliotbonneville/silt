/**
 * Combat death handling logic
 */

import { updateCharacter } from '../../database/character-repository.js';
import {
  createItem,
  findItemsInInventory,
  moveItemToRoom,
} from '../../database/item-repository.js';
import { createEvent } from '../create-game-event.js';
import type { EventPropagator } from '../event-propagator.js';

/**
 * Handle death logic (loot drop, corpse creation, combat ending)
 */
export async function handleDeath(
  attacker: { id: string; name: string; currentRoomId: string },
  target: { id: string; name: string },
  eventPropagator: EventPropagator,
  stopCombatForId: (id: string) => void,
  getAllCombatants: () => Map<string, { targetId: string }>,
): Promise<void> {
  await updateCharacter(target.id, {
    isAlive: false,
    isDead: true,
    diedAt: new Date(),
  });

  // Stop target from fighting
  stopCombatForId(target.id);

  // Stop anyone fighting the target (they won, combat ends for them)
  for (const [id, state] of getAllCombatants().entries()) {
    if (state.targetId === target.id) {
      stopCombatForId(id);
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
  await eventPropagator.broadcast(
    createEvent(
      'death',
      attacker.currentRoomId,
      'room',
      {
        victimId: target.id,
        victimName: target.name,
        killerId: attacker.id,
        killerName: attacker.name,
        itemsDropped: inventory.length,
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
