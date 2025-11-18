/**
 * Structured output types for command responses
 * Allows rich client UIs while providing text fallback for terminals/AI
 */

/**
 * Room description output
 */
export interface RoomOutput {
  readonly type: 'room';
  readonly data: {
    readonly name: string;
    readonly description: string;
    readonly exits: readonly {
      readonly direction: string;
      readonly roomName?: string;
    }[];
    readonly occupants: readonly {
      readonly id: string;
      readonly name: string;
      readonly isNpc: boolean;
    }[];
    readonly items: readonly {
      readonly id: string;
      readonly name: string;
    }[];
  };
  readonly text: string; // Pre-formatted for terminals
}

/**
 * Inventory output
 */
export interface InventoryOutput {
  readonly type: 'inventory';
  readonly data: {
    readonly items: readonly {
      readonly id: string;
      readonly name: string;
      readonly isEquipped: boolean;
      readonly itemType: string;
    }[];
  };
  readonly text: string;
}

/**
 * Item detail output (examine command)
 */
export interface ItemDetailOutput {
  readonly type: 'item_detail';
  readonly data: {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly itemType: string;
    readonly stats: {
      readonly damage?: number;
      readonly defense?: number;
      readonly healing?: number;
    };
  };
  readonly text: string;
}

/**
 * Character detail output (examine command)
 */
export interface CharacterDetailOutput {
  readonly type: 'character_detail';
  readonly data: {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly stats: {
      readonly level?: number;
      readonly hp: number;
      readonly maxHp: number;
      readonly attackPower: number;
      readonly defense: number;
    };
    readonly equipment?: {
      readonly weapon?: string;
      readonly armor?: string;
    };
  };
  readonly text: string;
}

/**
 * Generic system message (equip/unequip confirmations, etc.)
 */
export interface SystemMessageOutput {
  readonly type: 'system_message';
  readonly data: {
    readonly message: string;
    readonly context?: Record<string, unknown>;
  };
  readonly text: string;
}

/**
 * Union of all output types
 */
export type CommandOutput =
  | RoomOutput
  | InventoryOutput
  | ItemDetailOutput
  | CharacterDetailOutput
  | SystemMessageOutput;
