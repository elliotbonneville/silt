/**
 * Combat command system - attack and defense commands
 */

import type { GameEvent } from '@silt/shared';
import { findCharacterInRoom, updateCharacter } from '../database/character-repository.js';
import { createItem, findItemsInInventory, moveItemToRoom } from '../database/item-repository.js';
import type { CommandContext, CommandResult } from './commands.js';
import { createEvent } from './create-game-event.js';

const ATTACK_COOLDOWN_MS = 2000; // 2 seconds between attacks

/**
 * Execute the 'attack' command
 */
export async function executeAttackCommand(
  ctx: CommandContext,
  targetName: string,
): Promise<CommandResult> {
  if (!targetName) return { success: false, events: [], error: 'Attack who?' };

  const attacker = ctx.character;
  const target = await findCharacterInRoom(attacker.currentRoomId, targetName);

  if (!target) {
    return { success: false, events: [], error: `You don't see "${targetName}" here.` };
  }

  if (target.id === attacker.id) {
    return { success: false, events: [], error: "You can't attack yourself!" };
  }

  if (!target.isAlive) {
    return { success: false, events: [], error: `${target.name} is already dead.` };
  }

  // Check attack cooldown
  const now = Date.now();
  const lastAction = attacker.lastActionAt.getTime();
  const timeSinceLastAction = now - lastAction;

  if (timeSinceLastAction < ATTACK_COOLDOWN_MS) {
    const remainingMs = ATTACK_COOLDOWN_MS - timeSinceLastAction;
    const remainingSec = (remainingMs / 1000).toFixed(1);
    return {
      success: false,
      events: [],
      error: `You must wait ${remainingSec}s before attacking again.`,
    };
  }

  // Calculate damage
  const baseDamage = attacker.attackPower - target.defense;
  const damage = Math.max(1, baseDamage); // Minimum 1 damage

  // Apply damage to target
  const newHp = Math.max(0, target.hp - damage);
  await updateCharacter(target.id, { hp: newHp });

  // Update attacker cooldown
  const newLastAction = new Date(now);
  await updateCharacter(attacker.id, { lastActionAt: newLastAction });

  const roomId = attacker.currentRoomId;
  const events: GameEvent[] = [];

  // Combat hit event
  events.push(
    createEvent('combat_hit', roomId, 'room', {
      actorId: attacker.id,
      actorName: attacker.name,
      targetId: target.id,
      targetName: target.name,
      damage,
      targetHp: newHp,
      targetMaxHp: target.maxHp,
    }),
  );

  // Check for death
  if (newHp === 0) {
    await updateCharacter(target.id, {
      isAlive: false,
      isDead: true,
      diedAt: new Date(),
    });

    // Drop all inventory items to the room
    const inventory = await findItemsInInventory(target.id);
    for (const item of inventory) {
      await moveItemToRoom(item.id, roomId);
    }

    // Create corpse item
    const itemNames = inventory.map((i) => i.name).join(', ');
    const corpseDescription =
      inventory.length > 0
        ? `The lifeless body of ${target.name}. You can see: ${itemNames}.`
        : `The lifeless body of ${target.name}.`;

    await createItem({
      name: `${target.name}'s corpse`,
      description: corpseDescription,
      itemType: 'misc',
      roomId,
    });

    events.push(
      createEvent('death', roomId, 'room', {
        victimId: target.id,
        victimName: target.name,
        killerId: attacker.id,
        killerName: attacker.name,
        itemsDropped: inventory.length,
      }),
    );
  }

  return { success: true, events };
}
