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
 */
export function createCharacterId(id: string): CharacterId {
  return id as CharacterId;
}

export function createRoomId(id: string): RoomId {
  return id as RoomId;
}

export function createItemId(id: string): ItemId {
  return id as ItemId;
}

export function createActorId(id: string): ActorId {
  return id as ActorId;
}

export function createEventId(id: string): EventId {
  return id as EventId;
}
