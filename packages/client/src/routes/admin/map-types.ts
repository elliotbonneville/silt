/**
 * Type definitions for admin map
 */

export interface RoomData {
  id: string;
  name: string;
  description: string;
  exits: Record<string, string>;
  occupants: number;
  items: number;
  occupantList?: Array<{
    id: string;
    name: string;
    isNpc: boolean;
    isAIAgent: boolean;
    agentId: string | null;
    hp: number;
    maxHp: number;
  }>;
  itemList?: Array<{
    id: string;
    name: string;
    itemType: string;
  }>;
}
