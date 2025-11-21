/**
 * Movement event formatters
 */

export function formatMovement(
  data: Record<string, unknown>,
  isYou: boolean,
  isOmniscient: boolean,
  viewerRoomId?: string,
): string {
  const actor = data['actorName'];
  const direction = data['direction'];
  const toRoomId = data['toRoomId'];
  const fromRoomId = data['fromRoomId'];

  if (typeof actor !== 'string' || typeof direction !== 'string') {
    return isOmniscient ? 'movement' : 'Someone moves.';
  }

  if (isOmniscient) {
    return `${actor} moves ${direction}`;
  }

  // Determine if viewer is in destination or source room
  const viewerInDestination =
    viewerRoomId && typeof toRoomId === 'string' && viewerRoomId === toRoomId;
  const viewerInSource =
    viewerRoomId && typeof fromRoomId === 'string' && viewerRoomId === fromRoomId;

  // If viewer is the one moving, only show departure message
  if (isYou) {
    if (viewerInSource) {
      return `You move ${direction}.`;
    }
    return '';
  }

  // Viewer is someone else watching the movement
  if (viewerInDestination) {
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
    return fromDir ? `${actor} arrives from the ${fromDir}.` : `${actor} arrives from somewhere.`;
  }

  if (viewerInSource) {
    return `${actor} moves ${direction}.`;
  }

  return `${actor} moves ${direction}.`;
}

export function formatPlayerEntered(data: Record<string, unknown>, isOmniscient: boolean): string {
  const player = data['actorName'];
  if (typeof player !== 'string') {
    return isOmniscient ? 'player_entered' : 'Someone has entered the room.';
  }
  if (isOmniscient) {
    return `${player} entered the room`;
  }
  return `${player} has entered the room.`;
}

export function formatPlayerLeft(data: Record<string, unknown>, isOmniscient: boolean): string {
  const player = data['actorName'];
  if (typeof player !== 'string') {
    return isOmniscient ? 'player_left' : 'Someone has left the room.';
  }
  if (isOmniscient) {
    return `${player} left the room`;
  }
  return `${player} has left the room.`;
}
