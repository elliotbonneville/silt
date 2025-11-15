/**
 * Game event types for real-time communication
 * Events are the primary way game state changes are communicated
 */

import type { ActorId, CharacterId, EventId, ItemId, RoomId } from './branded.js';

/**
 * Reference to an entity for logging and event tracking
 */
export interface EntityReference {
  readonly id: string;
  readonly type: 'character' | 'item' | 'room';
  readonly name: string;
}

/**
 * Event visibility determines who can see the event
 */
export type EventVisibility = 'room' | 'global' | 'private';

/**
 * Event types for different game actions
 */
export type GameEventType =
  | 'movement'
  | 'combat_start'
  | 'combat_hit'
  | 'death'
  | 'speech'
  | 'whisper'
  | 'shout'
  | 'emote'
  | 'item_pickup'
  | 'item_drop'
  | 'item_equip'
  | 'room_description'
  | 'player_entered'
  | 'player_left'
  | 'ambient'
  | 'system'
  | 'connection'
  | 'state_change';

/**
 * Core game event structure
 * All game state changes are communicated through events
 */
export interface GameEvent {
  readonly id: EventId;
  readonly type: GameEventType;
  readonly timestamp: number;
  readonly originRoomId: RoomId;

  readonly actor?: EntityReference;
  readonly target?: EntityReference;
  readonly location?: EntityReference;
  readonly relatedEntities: readonly EntityReference[];

  readonly action?: string;
  readonly content?: string;
  readonly data?: Record<string, unknown>;

  readonly visibility: EventVisibility;
  readonly attenuated?: boolean;
}

/**
 * Movement event data
 */
export interface MovementEventData {
  readonly actorId: ActorId;
  readonly actorName: string;
  readonly fromRoomId: RoomId;
  readonly toRoomId: RoomId;
  readonly direction: string;
}

/**
 * Combat event data
 */
export interface CombatEventData {
  readonly attackerId: CharacterId;
  readonly attackerName: string;
  readonly targetId: CharacterId;
  readonly targetName: string;
  readonly damage: number;
  readonly targetHp: number;
  readonly targetMaxHp: number;
}

/**
 * Speech event data
 */
export interface SpeechEventData {
  readonly speakerId: ActorId;
  readonly speakerName: string;
  readonly message: string;
  readonly speechType: 'say' | 'whisper' | 'shout' | 'emote';
}

/**
 * Room state for client rendering
 */
export interface RoomState {
  readonly room: {
    readonly id: RoomId;
    readonly name: string;
    readonly description: string;
  };
  readonly exits: readonly {
    readonly direction: string;
    readonly roomId: RoomId;
    readonly roomName: string;
  }[];
  readonly occupants: readonly {
    readonly id: ActorId;
    readonly name: string;
    readonly type: 'player' | 'ai_agent';
  }[];
  readonly items: readonly {
    readonly id: ItemId;
    readonly name: string;
  }[];
}
