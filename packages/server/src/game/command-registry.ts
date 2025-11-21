/**
 * Command registry - metadata about all available commands
 * Used to generate OpenAI function schemas for AI agents
 */

export interface CommandDefinition {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly description: string;
  readonly usage: string;
  readonly category: 'movement' | 'combat' | 'social' | 'inventory' | 'observation';
  readonly requiredArgs?: readonly string[];
  readonly optionalArgs?: readonly string[];
  readonly aiUsable: boolean; // Can AI agents use this command?
}

/**
 * Registry of all commands with metadata
 */
export const COMMAND_REGISTRY: readonly CommandDefinition[] = [
  {
    name: 'look',
    aliases: ['l'],
    description: 'Observe your surroundings and see what is in the room',
    usage: 'look',
    category: 'observation',
    aiUsable: true,
  },
  {
    name: 'go',
    aliases: ['move', 'walk', 'n', 's', 'e', 'w', 'u', 'd'],
    description: 'Move to an adjacent room in the specified direction',
    usage: 'go <direction>',
    category: 'movement',
    requiredArgs: ['direction'],
    aiUsable: true,
  },
  {
    name: 'say',
    aliases: [],
    description: 'Say something to everyone in the room',
    usage: 'say <message>',
    category: 'social',
    requiredArgs: ['message'],
    aiUsable: true,
  },
  {
    name: 'shout',
    aliases: [],
    description: 'Shout something loudly that can be heard in nearby rooms',
    usage: 'shout <message>',
    category: 'social',
    requiredArgs: ['message'],
    aiUsable: true,
  },
  {
    name: 'emote',
    aliases: ['me'],
    description: 'Perform an action or emote',
    usage: 'emote <action>',
    category: 'social',
    requiredArgs: ['action'],
    aiUsable: true,
  },
  {
    name: 'attack',
    aliases: ['kill', 'fight', 'hit'],
    description: 'Attack a target in the room',
    usage: 'attack <target>',
    category: 'combat',
    requiredArgs: ['target'],
    aiUsable: true,
  },
  {
    name: 'flee',
    aliases: ['run', 'escape'],
    description: 'Attempt to flee from combat to a random adjacent room',
    usage: 'flee',
    category: 'combat',
    aiUsable: true,
  },
  {
    name: 'stop',
    aliases: [],
    description: 'Stop attacking your current target',
    usage: 'stop',
    category: 'combat',
    aiUsable: true,
  },
  {
    name: 'take',
    aliases: ['get', 'pickup'],
    description: 'Pick up an item from the room',
    usage: 'take <item>',
    category: 'inventory',
    requiredArgs: ['item'],
    aiUsable: true,
  },
  {
    name: 'drop',
    aliases: [],
    description: 'Drop an item from your inventory',
    usage: 'drop <item>',
    category: 'inventory',
    requiredArgs: ['item'],
    aiUsable: true,
  },
  {
    name: 'examine',
    aliases: ['exam', 'ex'],
    description: 'Examine an item or character in detail',
    usage: 'examine <target>',
    category: 'observation',
    requiredArgs: ['target'],
    aiUsable: true,
  },
  {
    name: 'inventory',
    aliases: ['inv', 'i'],
    description: 'View your inventory',
    usage: 'inventory',
    category: 'inventory',
    aiUsable: false, // AI doesn't need to check inventory explicitly
  },
  {
    name: 'equip',
    aliases: ['wield', 'wear'],
    description: 'Equip a weapon or armor',
    usage: 'equip <item>',
    category: 'inventory',
    requiredArgs: ['item'],
    aiUsable: true,
  },
];

/**
 * Generate OpenAI function schemas for AI agents
 */
export function generateOpenAIFunctionSchemas(): Array<{
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string }>;
      required: string[];
    };
  };
}> {
  return COMMAND_REGISTRY.filter((cmd) => cmd.aiUsable).map((cmd) => ({
    type: 'function' as const,
    function: {
      name: cmd.name,
      description: cmd.description,
      parameters: {
        type: 'object' as const,
        properties: generatePropertiesFromArgs(cmd),
        required: cmd.requiredArgs ? [...cmd.requiredArgs] : [],
      },
    },
  }));
}

/**
 * Generate parameter properties from command args
 */
function generatePropertiesFromArgs(
  cmd: CommandDefinition,
): Record<string, { type: string; description: string }> {
  const props: Record<string, { type: string; description: string }> = {};

  if (cmd.requiredArgs) {
    for (const arg of cmd.requiredArgs) {
      props[arg] = {
        type: 'string',
        description: getArgDescription(cmd.name, arg),
      };
    }
  }

  if (cmd.optionalArgs) {
    for (const arg of cmd.optionalArgs) {
      props[arg] = {
        type: 'string',
        description: getArgDescription(cmd.name, arg),
      };
    }
  }

  return props;
}

/**
 * Get description for command arguments
 */
function getArgDescription(commandName: string, argName: string): string {
  const descriptions: Record<string, Record<string, string>> = {
    go: { direction: 'Direction to move (north, south, east, west, up, down)' },
    attack: { target: 'Name of the character to attack' },
    say: { message: 'What to say' },
    shout: { message: 'What to shout (can be heard in nearby rooms)' },
    emote: { action: 'Action to perform' },
    take: { item: 'Name of the item to pick up' },
    drop: { item: 'Name of the item to drop' },
    examine: { target: 'Name of the item or character to examine' },
    equip: { item: 'Name of the item to equip' },
  };

  return descriptions[commandName]?.[argName] || `The ${argName} for ${commandName}`;
}
