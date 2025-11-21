/**
 * Combat event formatters
 */

export function formatCombatStart(data: Record<string, unknown>, isOmniscient: boolean): string {
  const attacker = data['actorName'];
  const target = data['targetName'];
  const message = data['message'];

  if (typeof attacker !== 'string' || typeof target !== 'string' || typeof message !== 'string') {
    return isOmniscient ? 'combat_start' : 'Combat has started.';
  }

  return isOmniscient ? `${attacker} started fighting ${target}` : message;
}

export function formatCombatHit(
  data: Record<string, unknown>,
  isYou: boolean,
  isOmniscient: boolean,
  viewerActorId?: string,
): string {
  const attacker = data['actorName'];
  const target = data['targetName'];
  const targetId = data['targetId'];
  const damage = data['damage'];
  const targetHp = data['targetHp'];
  const targetMaxHp = data['targetMaxHp'];

  if (
    typeof attacker !== 'string' ||
    typeof target !== 'string' ||
    typeof damage !== 'number' ||
    typeof targetHp !== 'number' ||
    typeof targetMaxHp !== 'number'
  ) {
    return isOmniscient ? 'combat_hit' : 'Someone attacks someone.';
  }

  if (isOmniscient) {
    return `${attacker} attacks ${target} for ${damage} damage`;
  }

  const isAttacker = isYou;
  const isTarget = typeof targetId === 'string' && targetId === viewerActorId;

  if (isAttacker) {
    return `You attack ${target} for ${damage} damage! (${targetHp}/${targetMaxHp} HP)`;
  }
  if (isTarget) {
    return `${attacker} attacks you for ${damage} damage! (${targetHp}/${targetMaxHp} HP)`;
  }
  return `${attacker} attacks ${target} for ${damage} damage! (${targetHp}/${targetMaxHp} HP)`;
}

export function formatDeath(data: Record<string, unknown>, isOmniscient: boolean): string {
  const victim = data['victimName'];
  const killer = data['killerName'];
  if (typeof victim !== 'string' || typeof killer !== 'string') {
    return isOmniscient ? 'death' : 'Someone has died.';
  }
  if (isOmniscient) {
    return `💀 ${victim} was slain by ${killer}`;
  }
  return `💀 ${victim} has been slain by ${killer}!`;
}
