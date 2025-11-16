/**
 * Format event content based on viewer's perspective
 * Single source of truth for all event formatting
 */

import type { GameEvent } from '@silt/shared';

/**
 * Format event content for a specific viewer (actor)
 * Returns first-person ("You") for the actor, third-person for others
 */
export function formatEventContent(event: GameEvent, viewerActorId: string): string {
  const data = event.data;
  if (!data) {
    return event.content || 'Something happened.';
  }

  const actorId = data['actorId'];
  const isYou = typeof actorId === 'string' && actorId === viewerActorId;

  switch (event.type) {
    case 'speech': {
      const speaker = data['actorName'];
      const message = data['message'];
      if (typeof speaker !== 'string' || typeof message !== 'string') {
        return event.content || 'Someone says something.';
      }
      return isYou ? `You say: "${message}"` : `${speaker} says: "${message}"`;
    }

    case 'shout': {
      const speaker = data['actorName'];
      const message = data['message'];
      if (typeof speaker !== 'string' || typeof message !== 'string') {
        return event.content || 'Someone shouts something.';
      }
      return isYou ? `You shout: "${message}"` : `${speaker} shouts: "${message}"`;
    }

    case 'emote': {
      const actor = data['actorName'];
      const action = data['action'];
      if (typeof actor !== 'string' || typeof action !== 'string') {
        return event.content || 'Someone does something.';
      }
      return isYou ? `You ${action}` : `${actor} ${action}`;
    }

    case 'movement': {
      const actor = data['actorName'];
      const direction = data['direction'];
      const toRoomId = data['toRoomId'];

      if (typeof actor !== 'string' || typeof direction !== 'string') {
        return event.content || 'Someone moves.';
      }

      // Check if viewer is in the destination room (seeing arrival)
      // If originRoomId != toRoomId, this is being shown in the destination room
      const isArrival = typeof toRoomId === 'string' && event.originRoomId !== toRoomId;

      if (isArrival) {
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
        const fromDir = oppositeDirection[direction.toLowerCase()] || 'somewhere';
        return isYou ? `You arrive from the ${fromDir}.` : `${actor} arrives from the ${fromDir}.`;
      }

      // Viewer is in origin room - show departure message
      return isYou ? `You move ${direction}.` : `${actor} moves ${direction}.`;
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
        return event.content || 'Someone attacks someone.';
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
        return event.content || 'Someone takes something.';
      }
      return isYou ? `You take ${item}.` : `${actor} takes ${item}.`;
    }

    case 'item_drop': {
      const actor = data['actorName'];
      const item = data['itemName'];
      if (typeof actor !== 'string' || typeof item !== 'string') {
        return event.content || 'Someone drops something.';
      }
      return isYou ? `You drop ${item}.` : `${actor} drops ${item}.`;
    }

    case 'player_entered': {
      const player = data['actorName'];
      if (typeof player !== 'string') {
        return event.content || 'Someone has entered the room.';
      }
      return `${player} has entered the room.`;
    }

    case 'player_left': {
      const player = data['actorName'];
      if (typeof player !== 'string') {
        return event.content || 'Someone has left the room.';
      }
      return `${player} has left the room.`;
    }

    case 'death': {
      const victim = data['victimName'];
      const killer = data['killerName'];
      if (typeof victim !== 'string' || typeof killer !== 'string') {
        return event.content || 'Someone has died.';
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

/**
 * Format event with omniscient perspective for admin view
 * Always third-person, shows all details
 */
export function formatEventOmniscient(event: GameEvent): string {
  const data = event.data;
  if (!data) {
    return event.content || event.type;
  }

  switch (event.type) {
    case 'speech': {
      const speaker = data['actorName'];
      const message = data['message'];
      if (typeof speaker !== 'string' || typeof message !== 'string') {
        return event.type;
      }
      return `${speaker} says: "${message}"`;
    }

    case 'shout': {
      const speaker = data['actorName'];
      const message = data['message'];
      if (typeof speaker !== 'string' || typeof message !== 'string') return event.type;
      return `${speaker} shouts: "${message}"`;
    }

    case 'emote': {
      const actor = data['actorName'];
      const action = data['action'];
      if (typeof actor !== 'string' || typeof action !== 'string') return event.type;
      return `${actor} ${action}`;
    }

    case 'movement': {
      const actor = data['actorName'];
      const direction = data['direction'];
      if (typeof actor !== 'string' || typeof direction !== 'string') return event.type;
      return `${actor} moves ${direction}`;
    }

    case 'combat_hit': {
      const attacker = data['actorName'];
      const target = data['targetName'];
      const damage = data['damage'];
      if (
        typeof attacker !== 'string' ||
        typeof target !== 'string' ||
        typeof damage !== 'number'
      ) {
        return event.type;
      }
      return `${attacker} attacks ${target} for ${damage} damage`;
    }

    case 'death': {
      const victim = data['victimName'];
      const killer = data['killerName'];
      if (typeof victim !== 'string' || typeof killer !== 'string') return event.type;
      return `💀 ${victim} was slain by ${killer}`;
    }

    case 'item_pickup': {
      const actor = data['actorName'];
      const item = data['itemName'];
      if (typeof actor !== 'string' || typeof item !== 'string') return event.type;
      return `${actor} takes ${item}`;
    }

    case 'item_drop': {
      const actor = data['actorName'];
      const item = data['itemName'];
      if (typeof actor !== 'string' || typeof item !== 'string') return event.type;
      return `${actor} drops ${item}`;
    }

    case 'player_entered': {
      const player = data['actorName'];
      if (typeof player !== 'string') return event.type;
      return `${player} entered the room`;
    }

    case 'player_left': {
      const player = data['actorName'];
      if (typeof player !== 'string') return event.type;
      return `${player} left the room`;
    }

    default:
      return event.content || event.type;
  }
}
