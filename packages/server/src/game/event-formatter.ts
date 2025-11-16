/**
 * Event formatter - converts GameEvents to human-readable text for AI context
 */

import type { GameEvent } from '@silt/shared';

/**
 * Format a game event for AI context
 */
export function formatEventForAI(event: GameEvent): string {
  const data = event.data || {};

  switch (event.type) {
    case 'speech': {
      const speaker = data['actorName'] || 'Someone';
      const message = data['message'] || '';
      return `${speaker} says: "${message}"`;
    }

    case 'shout': {
      const speaker = data['actorName'] || 'Someone';
      const message = data['message'] || '';
      return `${speaker} shouts: "${message}"`;
    }

    case 'emote': {
      const actor = data['actorName'] || 'Someone';
      const action = data['action'] || '';
      return `${actor} ${action}`;
    }

    case 'combat_hit': {
      const attacker = data['actorName'] || 'Someone';
      const target = data['targetName'] || 'someone';
      const damage = data['damage'] || 0;
      const targetHp = data['targetHp'] || 0;
      const targetMaxHp = data['targetMaxHp'] || 0;
      return `${attacker} attacked ${target} for ${damage} damage (${target} HP: ${targetHp}/${targetMaxHp})`;
    }

    case 'death': {
      const victim = data['victimName'] || 'Someone';
      const killer = data['killerName'] || 'someone';
      return `${victim} was slain by ${killer}`;
    }

    case 'movement': {
      const actor = data['actorName'] || 'Someone';
      const direction = data['direction'] || 'away';
      return `${actor} moved ${direction}`;
    }

    case 'player_entered': {
      const player = data['actorName'] || 'Someone';
      return `${player} entered the room`;
    }

    case 'player_left': {
      const player = data['actorName'] || 'Someone';
      return `${player} left the room`;
    }

    case 'item_pickup': {
      const actor = data['actorName'] || 'Someone';
      const item = data['itemName'] || 'something';
      return `${actor} picked up ${item}`;
    }

    case 'item_drop': {
      const actor = data['actorName'] || 'Someone';
      const item = data['itemName'] || 'something';
      return `${actor} dropped ${item}`;
    }

    default:
      return event.content || 'Something happened';
  }
}

/**
 * Format multiple events for AI context
 */
export function formatEventsForAI(events: GameEvent[]): string[] {
  return events.map(formatEventForAI);
}
