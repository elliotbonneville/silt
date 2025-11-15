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

/**
 * Character list item for character selection
 */
export interface CharacterListItem {
  readonly id: string;
  readonly name: string;
  readonly isAlive: boolean;
  readonly hp: number;
  readonly maxHp: number;
  readonly createdAt: string;
  readonly diedAt?: string | undefined;
}
