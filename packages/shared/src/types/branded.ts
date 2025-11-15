/**
 * Branded types for type-safe IDs
 * Prevents mixing up different ID types at compile time
 */

declare const brand: unique symbol;

type Brand<T, TBrand extends string> = T & { readonly [brand]: TBrand };

export type CharacterId = Brand<string, 'CharacterId'>;
export type RoomId = Brand<string, 'RoomId'>;
export type ItemId = Brand<string, 'ItemId'>;
export type ActorId = Brand<string, 'ActorId'>;
export type EventId = Brand<string, 'EventId'>;

/**
 * Create a branded ID from a string
 * Use this when receiving IDs from database or external sources
 * Note: Branded type constructors are the one legitimate use of type assertions
 */
export function createCharacterId(id: string): CharacterId {
  // biome-ignore lint/plugin: Branded type constructors require type assertions
  return id as CharacterId;
}

export function createRoomId(id: string): RoomId {
  // biome-ignore lint/plugin: Branded type constructors require type assertions
  return id as RoomId;
}

export function createItemId(id: string): ItemId {
  // biome-ignore lint/plugin: Branded type constructors require type assertions
  return id as ItemId;
}

export function createActorId(id: string): ActorId {
  // biome-ignore lint/plugin: Branded type constructors require type assertions
  return id as ActorId;
}

export function createEventId(id: string): EventId {
  // biome-ignore lint/plugin: Branded type constructors require type assertions
  return id as EventId;
}
