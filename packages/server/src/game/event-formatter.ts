/**
 * Format event content based on viewer's perspective
 * Single source of truth for all event formatting
 */

import type { GameEvent } from '@silt/shared';
import { formatCombatHit, formatCombatStart, formatDeath } from './formatters/combat-formatters.js';
import { formatItemDrop, formatItemPickup } from './formatters/item-formatters.js';
import {
  formatMovement,
  formatPlayerEntered,
  formatPlayerLeft,
} from './formatters/movement-formatters.js';
import {
  formatEmote,
  formatShout,
  formatSpeech,
  formatTell,
  formatWhisper,
} from './formatters/social-formatters.js';

/**
 * Format event content for a specific viewer (actor)
 * Returns first-person ("You") for the actor, third-person for others
 * If viewerActorId is not provided, returns omniscient perspective for admin view
 */
export function formatEventContent(
  event: GameEvent,
  viewerActorId?: string,
  viewerRoomId?: string,
  isListening = false,
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
    case 'speech':
      return formatSpeech(data, isYou, isOmniscient);

    case 'tell':
      return formatTell(data, isYou, isOmniscient, viewerActorId, isListening);

    case 'whisper':
      return formatWhisper(data, isYou, isOmniscient, viewerActorId);

    case 'shout':
      return formatShout(data, isYou, isOmniscient, event, viewerRoomId);

    case 'emote':
      return formatEmote(data, isYou, isOmniscient);

    case 'movement':
      return formatMovement(data, isYou, isOmniscient, viewerRoomId);

    case 'combat_start':
      return formatCombatStart(data, isOmniscient);

    case 'combat_hit':
      return formatCombatHit(data, isYou, isOmniscient, viewerActorId);

    case 'item_pickup':
      return formatItemPickup(data, isYou, isOmniscient);

    case 'item_drop':
      return formatItemDrop(data, isYou, isOmniscient);

    case 'player_entered':
      return formatPlayerEntered(data, isOmniscient);

    case 'player_left':
      return formatPlayerLeft(data, isOmniscient);

    case 'death':
      return formatDeath(data, isOmniscient);

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
