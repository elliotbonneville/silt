/**
 * Player represents a connected human player
 */

import type { ActorId, RoomId } from '@silt/shared';
import { createActorId } from '@silt/shared';
import { nanoid } from 'nanoid';

export interface Player {
  readonly id: ActorId;
  readonly name: string;
  currentRoomId: RoomId;
  readonly connectedAt: Date;
}

export function createPlayer(name: string, startingRoomId: RoomId): Player {
  return {
    id: createActorId(`player-${nanoid(10)}`),
    name,
    currentRoomId: startingRoomId,
    connectedAt: new Date(),
  };
}
