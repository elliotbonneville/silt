/**
 * Character types - represents a game character
 */

/**
 * Character data (matches Prisma model)
 */
export interface Character {
  readonly id: string;
  readonly name: string;
  readonly accountId: string | null;
  currentRoomId: string;
  readonly spawnRoomId: string;
  hp: number;
  maxHp: number;
  attackPower: number;
  defense: number;
  isAlive: boolean;
  readonly isDead: boolean;
  readonly lastActionAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly diedAt: Date | null;
}
