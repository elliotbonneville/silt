/**
 * Combat command system - attack and defense commands
 */

import type { Character } from '@prisma/client';
import type { EventVisibility, GameEvent, GameEventType } from '@silt/shared';
import { nanoid } from 'nanoid';
import { updateCharacter } from '../database/character-repository.js';
import type { CommandContext, CommandResult } from './commands.js';

const ATTACK_COOLDOWN_MS = 2000; // 2 seconds between attacks

/**
 * Create a game event with common fields filled in
 */
function createEvent(
  type: GameEventType,
  roomId: string,
  content: string,
  visibility: EventVisibility,
  data?: Record<string, unknown>,
): GameEvent {
  const event: GameEvent = {
    id: `event-${nanoid(10)}`,
    type,
    timestamp: Date.now(),
    originRoomId: roomId,
    content,
    relatedEntities: [],
    visibility,
  };

  if (data !== undefined) {
    return { ...event, data };
  }

  return event;
}

/**
 * Execute the 'attack' command
 */
export async function executeAttackCommand(
  ctx: CommandContext,
  targetName: string,
  getCharacterInRoom: (roomId: string, name: string) => Character | undefined,
): Promise<CommandResult> {
  if (!targetName) return { success: false, events: [], error: 'Attack who?' };

  const attacker = ctx.character;
  const target = getCharacterInRoom(attacker.currentRoomId, targetName);

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
  target.hp = newHp; // Update in-memory object
  await updateCharacter(target.id, { hp: newHp });

  // Update attacker cooldown
  const newLastAction = new Date(now);
  attacker.lastActionAt = newLastAction; // Update in-memory object
  await updateCharacter(attacker.id, { lastActionAt: newLastAction });

  const roomId = attacker.currentRoomId;
  const events: GameEvent[] = [];

  // Combat hit event
  events.push(
    createEvent(
      'combat_hit',
      roomId,
      `${attacker.name} attacks ${target.name} for ${damage} damage! (${newHp}/${target.maxHp} HP)`,
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
    ),
  );

  // Check for death
  if (newHp === 0) {
    target.isAlive = false; // Update in-memory object
    target.isDead = true; // Update in-memory object
    await updateCharacter(target.id, {
      isAlive: false,
      isDead: true,
      diedAt: new Date(),
    });

    events.push(
      createEvent(
        'death',
        roomId,
        `💀 ${target.name} has been slain by ${attacker.name}!`,
        'room',
        {
          victimId: target.id,
          victimName: target.name,
          killerId: attacker.id,
          killerName: attacker.name,
        },
      ),
    );
  }

  return { success: true, events };
}
