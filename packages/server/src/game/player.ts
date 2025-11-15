/**
 * Player session - tracks socket connection to a character
 * A player session connects a human (via socket) to their character
 */

export interface PlayerSession {
  readonly socketId: string;
  readonly characterId: string;
  readonly connectedAt: Date;
}

/**
 * Create a new player session
 */
export function createPlayerSession(socketId: string, characterId: string): PlayerSession {
  return {
    socketId,
    characterId,
    connectedAt: new Date(),
  };
}
