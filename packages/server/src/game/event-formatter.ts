/**
 * Format event content based on viewer's perspective
 * Single source of truth for all event formatting
 */

import type { GameEvent } from '@silt/shared';

/**
 * Format event content for a specific viewer (actor)
 * Returns first-person ("You") for the actor, third-person for others
 * If viewerActorId is not provided, returns omniscient perspective for admin view
 */
export function formatEventContent(
  event: GameEvent,
  viewerActorId?: string,
  viewerRoomId?: string,
): string {
  const data = event.data;
  if (!data) {
    return event.content || 'Something happened.';
  }

  // If no viewer, use omniscient perspective
  const isOmniscient = !viewerActorId;

  const actorId = data['actorId'];
  const isYou = !isOmniscient && typeof actorId === 'string' && actorId === viewerActorId;

  switch (event.type) {
    case 'speech': {
      const speaker = data['actorName'];
      const message = data['message'];
      if (typeof speaker !== 'string' || typeof message !== 'string') {
        return event.content || (isOmniscient ? event.type : 'Someone says something.');
      }
      return isYou ? `You say: "${message}"` : `${speaker} says: "${message}"`;
    }

    case 'shout': {
      const speaker = data['actorName'];
      const message = data['message'];
      const shoutOriginRoom = event.originRoomId;

      if (typeof speaker !== 'string' || typeof message !== 'string') {
        return event.content || (isOmniscient ? event.type : 'Someone shouts something.');
      }

      if (isOmniscient) {
        return `${speaker} shouts: "${message}"`;
      }

      if (isYou) {
        return `You shout: "${message}"`;
      }

      // Add directional context if viewer is in different room
      if (viewerRoomId && shoutOriginRoom && viewerRoomId !== shoutOriginRoom) {
        // TODO: Calculate direction from viewerRoomId to shoutOriginRoom
        // For now, just indicate it's from elsewhere
        return `${speaker} shouts from somewhere: "${message}"`;
      }

      return `${speaker} shouts: "${message}"`;
    }

    case 'emote': {
      const actor = data['actorName'];
      const action = data['action'];
      if (typeof actor !== 'string' || typeof action !== 'string') {
        return event.content || (isOmniscient ? event.type : 'Someone does something.');
      }
      return isYou ? `You ${action}` : `${actor} ${action}`;
    }

    case 'movement': {
      const actor = data['actorName'];
      const direction = data['direction'];
      const toRoomId = data['toRoomId'];
      const fromRoomId = data['fromRoomId'];

      if (typeof actor !== 'string' || typeof direction !== 'string') {
        return event.content || (isOmniscient ? event.type : 'Someone moves.');
      }

      // Omniscient perspective - just report the movement
      if (isOmniscient) {
        return `${actor} moves ${direction}`;
      }

      // Determine if viewer is in destination or source room
      const viewerInDestination =
        viewerRoomId && typeof toRoomId === 'string' && viewerRoomId === toRoomId;
      const viewerInSource =
        viewerRoomId && typeof fromRoomId === 'string' && viewerRoomId === fromRoomId;

      // If viewer is the one moving, only show departure message (no arrival message)
      if (isYou) {
        if (viewerInSource) {
          return `You move ${direction}.`;
        }
        // If we're the mover and in destination room, don't show a message
        // (the room description is already shown as output)
        return '';
      }

      // Viewer is someone else watching the movement
      if (viewerInDestination) {
        // Viewer is in destination room - show arrival message
        const oppositeDirection: Record<string, string> = {
          north: 'south',
          south: 'north',
          east: 'west',
          west: 'east',
          northeast: 'southwest',
          southwest: 'northeast',
          northwest: 'southeast',
          southeast: 'northwest',
          up: 'below',
          down: 'above',
        };
        const fromDir = oppositeDirection[direction.toLowerCase()];
        return fromDir
          ? `${actor} arrives from the ${fromDir}.`
          : `${actor} arrives from somewhere.`;
      }

      if (viewerInSource) {
        // Viewer is in source room - show departure message
        return `${actor} moves ${direction}.`;
      }

      // Fallback (shouldn't happen if viewerRoomId is provided correctly)
      return `${actor} moves ${direction}.`;
    }

    case 'combat_hit': {
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
        return event.content || (isOmniscient ? event.type : 'Someone attacks someone.');
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

    case 'item_pickup': {
      const actor = data['actorName'];
      const item = data['itemName'];
      if (typeof actor !== 'string' || typeof item !== 'string') {
        return event.content || (isOmniscient ? event.type : 'Someone takes something.');
      }
      if (isOmniscient) {
        return `${actor} takes ${item}`;
      }
      return isYou ? `You take ${item}.` : `${actor} takes ${item}.`;
    }

    case 'item_drop': {
      const actor = data['actorName'];
      const item = data['itemName'];
      if (typeof actor !== 'string' || typeof item !== 'string') {
        return event.content || (isOmniscient ? event.type : 'Someone drops something.');
      }
      if (isOmniscient) {
        return `${actor} drops ${item}`;
      }
      return isYou ? `You drop ${item}.` : `${actor} drops ${item}.`;
    }

    case 'player_entered': {
      const player = data['actorName'];
      if (typeof player !== 'string') {
        return event.content || (isOmniscient ? event.type : 'Someone has entered the room.');
      }
      if (isOmniscient) {
        return `${player} entered the room`;
      }
      return `${player} has entered the room.`;
    }

    case 'player_left': {
      const player = data['actorName'];
      if (typeof player !== 'string') {
        return event.content || (isOmniscient ? event.type : 'Someone has left the room.');
      }
      if (isOmniscient) {
        return `${player} left the room`;
      }
      return `${player} has left the room.`;
    }

    case 'death': {
      const victim = data['victimName'];
      const killer = data['killerName'];
      if (typeof victim !== 'string' || typeof killer !== 'string') {
        return event.content || (isOmniscient ? event.type : 'Someone has died.');
      }
      if (isOmniscient) {
        return `💀 ${victim} was slain by ${killer}`;
      }
      return `💀 ${victim} has been slain by ${killer}!`;
    }

    case 'room_description':
    case 'system':
    case 'ambient':
    case 'connection':
      // These event types are always the same for everyone
      return event.content || 'Something happened.';

    default:
      // Fallback to existing content
      return event.content || 'Something happened.';
  }
}
