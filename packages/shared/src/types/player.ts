/**
 * Player types for client-server communication
 */

import type { ActorId, RoomId } from './branded.js';

/**
 * Player data for client UI
 */
export interface Player {
  readonly id: ActorId;
  readonly name: string;
  currentRoomId: RoomId;
  readonly connectedAt: Date;
}
