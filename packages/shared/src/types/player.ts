/**
 * Player types for client-server communication
 */

/**
 * Player data for client UI
 */
export interface Player {
  readonly id: string;
  readonly characterId: string;
  readonly name: string;
  currentRoomId: string;
  hp: number;
  maxHp: number;
  attackPower: number;
  defense: number;
  isAlive: boolean;
  readonly connectedAt: Date;
}
