/**
 * Social event formatters - speech, communication, emotes
 */

import type { GameEvent } from '@silt/shared';

export function formatSpeech(
  data: Record<string, unknown>,
  isYou: boolean,
  isOmniscient: boolean,
): string {
  const speaker = data['actorName'];
  const message = data['message'];
  if (typeof speaker !== 'string' || typeof message !== 'string') {
    return isOmniscient ? 'speech' : 'Someone says something.';
  }
  return isYou ? `You say: "${message}"` : `${speaker} says: "${message}"`;
}

export function formatTell(
  data: Record<string, unknown>,
  isYou: boolean,
  isOmniscient: boolean,
  viewerActorId?: string,
  isListening = false,
): string {
  const sender = data['actorName'];
  const target = data['targetName'];
  const message = data['message'];
  const targetId = data['targetId'];

  if (typeof sender !== 'string' || typeof target !== 'string' || typeof message !== 'string') {
    return isOmniscient ? 'tell' : 'Someone says something.';
  }

  if (isOmniscient) {
    return `${sender} tells ${target}: "${message}"`;
  }

  if (isYou) {
    return `You say to ${target}: "${message}"`;
  }

  if (typeof targetId === 'string' && viewerActorId === targetId) {
    return `${sender} says to you: "${message}"`;
  }

  if (isListening) {
    return `${sender} says to ${target}: "${message}"`;
  }

  return `${sender} says something to ${target}.`;
}

export function formatWhisper(
  data: Record<string, unknown>,
  isYou: boolean,
  isOmniscient: boolean,
  viewerActorId?: string,
): string {
  const sender = data['actorName'];
  const target = data['targetName'];
  const message = data['message'];
  const targetId = data['targetId'];

  if (typeof sender !== 'string' || typeof target !== 'string' || typeof message !== 'string') {
    return isOmniscient ? 'whisper' : 'Someone whispers something.';
  }

  if (isOmniscient) {
    return `${sender} whispers to ${target}: "${message}"`;
  }

  if (isYou) {
    return `You whisper to ${target}: "${message}"`;
  }

  if (typeof targetId === 'string' && viewerActorId === targetId) {
    return `${sender} whispers to you: "${message}"`;
  }

  return `${sender} whispers something to ${target}.`;
}

export function formatShout(
  data: Record<string, unknown>,
  isYou: boolean,
  isOmniscient: boolean,
  event: GameEvent,
  viewerRoomId?: string,
): string {
  const speaker = data['actorName'];
  const message = data['message'];
  const shoutOriginRoom = event.originRoomId;

  if (typeof speaker !== 'string' || typeof message !== 'string') {
    return isOmniscient ? 'shout' : 'Someone shouts something.';
  }

  if (isOmniscient) {
    return `${speaker} shouts: "${message}"`;
  }

  if (isYou) {
    return `You shout: "${message}"`;
  }

  // Add directional context if viewer is in different room
  if (viewerRoomId && shoutOriginRoom && viewerRoomId !== shoutOriginRoom) {
    return `${speaker} shouts from somewhere: "${message}"`;
  }

  return `${speaker} shouts: "${message}"`;
}

export function formatEmote(
  data: Record<string, unknown>,
  isYou: boolean,
  isOmniscient: boolean,
): string {
  const actor = data['actorName'];
  const action = data['action'];
  if (typeof actor !== 'string' || typeof action !== 'string') {
    return isOmniscient ? 'emote' : 'Someone does something.';
  }
  return isYou ? `You ${action}` : `${actor} ${action}`;
}
