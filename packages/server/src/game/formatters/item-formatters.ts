/**
 * Item event formatters
 */

export function formatItemPickup(
  data: Record<string, unknown>,
  isYou: boolean,
  isOmniscient: boolean,
): string {
  const actor = data['actorName'];
  const item = data['itemName'];
  if (typeof actor !== 'string' || typeof item !== 'string') {
    return isOmniscient ? 'item_pickup' : 'Someone takes something.';
  }
  if (isOmniscient) {
    return `${actor} takes ${item}`;
  }
  return isYou ? `You take ${item}.` : `${actor} takes ${item}.`;
}

export function formatItemDrop(
  data: Record<string, unknown>,
  isYou: boolean,
  isOmniscient: boolean,
): string {
  const actor = data['actorName'];
  const item = data['itemName'];
  if (typeof actor !== 'string' || typeof item !== 'string') {
    return isOmniscient ? 'item_drop' : 'Someone drops something.';
  }
  if (isOmniscient) {
    return `${actor} drops ${item}`;
  }
  return isYou ? `You drop ${item}.` : `${actor} drops ${item}.`;
}
