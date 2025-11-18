/**
 * Database seed script
 * Creates the initial world with 5 rooms and items
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // biome-ignore lint/suspicious/noConsole: Seed script needs console output
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.gameEvent.deleteMany();
  await prisma.aIAgent.deleteMany();
  await prisma.item.deleteMany();
  await prisma.character.deleteMany();
  await prisma.room.deleteMany();

  // Create rooms
  const townSquare = await prisma.room.create({
    data: {
      id: 'town-square',
      name: 'Town Square',
      description:
        'A bustling town square with a fountain in the center. Merchants call out their wares while adventurers gather to share tales.',
      exitsJson: JSON.stringify({
        north: 'forest-path',
        east: 'tavern',
        west: 'training-grounds',
      }),
      isStarting: true,
    },
  });

  const tavern = await prisma.room.create({
    data: {
      id: 'tavern',
      name: 'The Cozy Tavern',
      description:
        'A warm tavern with a crackling fireplace. The smell of roasted meat and ale fills the air.',
      exitsJson: JSON.stringify({
        west: 'town-square',
      }),
    },
  });

  const trainingGrounds = await prisma.room.create({
    data: {
      id: 'training-grounds',
      name: 'Training Grounds',
      description:
        'An open field with practice dummies and weapon racks. The sound of clashing steel echoes here.',
      exitsJson: JSON.stringify({
        east: 'town-square',
      }),
    },
  });

  const forestPath = await prisma.room.create({
    data: {
      id: 'forest-path',
      name: 'Forest Path',
      description:
        'A dark forest path leading deeper into the wilderness. The trees loom overhead, blocking most of the sunlight.',
      exitsJson: JSON.stringify({
        south: 'town-square',
        north: 'dark-cave',
      }),
    },
  });

  const darkCave = await prisma.room.create({
    data: {
      id: 'dark-cave',
      name: 'Dark Cave',
      description:
        'A damp, dark cave. Water drips from stalactites above. You hear strange sounds echoing in the darkness.',
      exitsJson: JSON.stringify({
        south: 'forest-path',
        northeast: 'mountain-peak',
        down: 'hidden-grotto',
      }),
    },
  });

  // One-way cave (can only exit, cannot enter from outside)
  await prisma.room.create({
    data: {
      id: 'hidden-grotto',
      name: 'Hidden Grotto',
      description:
        'A secret underground chamber. The opening you fell through is far above - too high to climb back.',
      exitsJson: JSON.stringify({
        east: 'underground-river',
      }),
    },
  });

  await prisma.room.create({
    data: {
      id: 'underground-river',
      name: 'Underground River',
      description: 'A rushing underground river. The current is strong and dangerous.',
      exitsJson: JSON.stringify({
        west: 'hidden-grotto',
        southwest: 'cavern-pool',
      }),
    },
  });

  await prisma.room.create({
    data: {
      id: 'cavern-pool',
      name: 'Cavern Pool',
      description:
        'A large underground pool with crystal-clear water. Light filters in from above.',
      exitsJson: JSON.stringify({
        northeast: 'underground-river',
        up: 'tavern',
      }),
    },
  });

  await prisma.room.create({
    data: {
      id: 'mountain-peak',
      name: 'Mountain Peak',
      description: 'The peak of a tall mountain. You can see the entire world laid out below you.',
      exitsJson: JSON.stringify({
        southwest: 'dark-cave',
        southeast: 'rocky-ledge',
      }),
    },
  });

  await prisma.room.create({
    data: {
      id: 'rocky-ledge',
      name: 'Rocky Ledge',
      description: 'A narrow ledge on the mountainside. One wrong step could be fatal.',
      exitsJson: JSON.stringify({
        northwest: 'mountain-peak',
      }),
    },
  });

  // biome-ignore lint/suspicious/noConsole: Seed script needs console output
  console.log('✓ Created 10 rooms (including one-way cave and diagonal connections)');

  // Create spawn points (special items for character respawning)
  // Players spawn here when creating new characters
  await prisma.item.create({
    data: {
      name: 'Town Fountain',
      description: 'A shimmering fountain that seems to pulse with magical energy.',
      itemType: 'spawn_point',
      statsJson: JSON.stringify({}),
      roomId: townSquare.id,
    },
  });

  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('✓ Created 1 spawn point');

  // Create items
  await prisma.item.create({
    data: {
      name: 'Wooden Sword',
      description: 'A simple practice sword made of sturdy oak. Better than nothing.',
      itemType: 'weapon',
      statsJson: JSON.stringify({ damage: 5 }),
      roomId: townSquare.id,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Leather Armor',
      description: 'Well-worn leather armor. Provides basic protection.',
      itemType: 'armor',
      statsJson: JSON.stringify({ defense: 3 }),
      roomId: trainingGrounds.id,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Health Potion',
      description: 'A small vial of red liquid that glows faintly. Restores health.',
      itemType: 'consumable',
      statsJson: JSON.stringify({ healing: 50 }),
      roomId: tavern.id,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Iron Sword',
      description: 'A well-balanced iron sword. Sharp and deadly.',
      itemType: 'weapon',
      statsJson: JSON.stringify({ damage: 15 }),
      roomId: forestPath.id,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Ancient Treasure',
      description: 'A glimmering chest filled with gold and jewels. The ultimate prize!',
      itemType: 'misc',
      statsJson: JSON.stringify({}),
      roomId: darkCave.id,
    },
  });

  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('✓ Created 5 items in rooms');

  // Create NPC characters (enemies for combat testing)
  // NPCs don't need spawn points - they're placed directly by admins
  const goblin = await prisma.character.create({
    data: {
      id: 'goblin-1',
      name: 'Goblin',
      description:
        'A small, green-skinned creature with a wicked grin and sharp teeth. It looks hungry.',
      currentRoomId: forestPath.id,
      hp: 30,
      maxHp: 30,
      attackPower: 8,
      defense: 3,
      isAlive: true,
      isDead: false,
    },
  });

  await prisma.character.create({
    data: {
      id: 'training-dummy',
      name: 'Training Dummy',
      description: 'A simple straw-filled dummy for combat practice. It has seen better days.',
      currentRoomId: trainingGrounds.id,
      hp: 50,
      maxHp: 50,
      attackPower: 0,
      defense: 0,
      isAlive: true,
      isDead: false,
    },
  });

  // Give Goblin some loot
  await prisma.item.create({
    data: {
      name: 'Rusty Dagger',
      description: 'A crude dagger, worn from use.',
      itemType: 'weapon',
      statsJson: JSON.stringify({ damage: 3 }),
      characterId: goblin.id,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Gold Coins',
      description: 'A small pouch of gold coins.',
      itemType: 'misc',
      statsJson: JSON.stringify({}),
      characterId: goblin.id,
    },
  });

  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('✓ Created 2 NPCs');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('✓ Created 2 items in NPC inventory');

  // Create AI-powered NPC (Town Crier)
  const townCrier = await prisma.character.create({
    data: {
      id: 'town-crier',
      name: 'Town Crier',
      description:
        'A loud and cheerful man in bright clothes. He seems to know everything about the town.',
      currentRoomId: townSquare.id,
      hp: 100,
      maxHp: 100,
      attackPower: 5,
      defense: 5,
      isAlive: true,
      isDead: false,
    },
  });

  await prisma.aIAgent.create({
    data: {
      characterId: townCrier.id,
      systemPrompt: `You are the Town Crier, a cheerful and helpful NPC stationed in the town square.

PERSONALITY: Friendly, knowledgeable, helpful. You know the area well and excel at giving clear directions.

YOUR EXPERTISE - GIVING DIRECTIONS:
You have an excellent mental map of nearby areas. When someone asks for directions:
- Give step-by-step instructions using exact directions (north, south, east, west, up, down)
- Example: "Go north to the Forest Path, then continue north to the Dark Cave"
- Mention landmarks and warnings: "The Forest Path has a goblin - be careful!"
- Use your spatial memory to trace the path

WHEN TO SPEAK:
- When someone directly addresses you by name ("Town Crier" or "Crier")
- When someone asks for directions or information about locations
- When someone asks questions about the area, combat, or game mechanics
- When greeting new arrivals to the square (but only once per person per visit)
- When something truly dramatic happens (deaths, major victories)

WHEN TO STAY SILENT:
- When people are having private conversations
- When nothing important is happening
- When you just spoke recently
- When mundane activities occur (people walking around, picking up items)

HELPFUL TIPS YOU CAN SHARE:
- Combat practice: "Try the Training Grounds to the west - perfect for beginners"
- Danger warnings: "The Forest Path north is dangerous - a goblin guards it"
- Healing: "The Tavern to the east has healing potions"
- Weapons: "Look for weapons in the square and training grounds before venturing north"

Keep responses to 1-2 sentences. Stay in character. You're a helpful guide but respectful of others' space.`,
      homeRoomId: townSquare.id,
      maxRoomsFromHome: 0, // Never leaves town square
    },
  });

  await prisma.aIAgent.create({
    data: {
      characterId: goblin.id,
      systemPrompt: `You are a Goblin warrior, a hostile and territorial creature guarding the forest path.

PERSONALITY: Aggressive, cunning, territorial. You enjoy intimidating intruders and protecting your domain.

TERRITORY: Forest Path (your home). You can roam up to 2 rooms away to chase enemies or patrol.

DECISION PRIORITY (CHECK IN THIS ORDER):
1. CHECK CURRENT SITUATION - Is there a player in the room with you RIGHT NOW?
   → YES: ATTACK them immediately (use "attack" command with their name)
   → NO: Go to step 2

2. CHECK EVENT LOG - Did a player just flee from your room?
   → YES: CHASE them (use "go" command with the direction they went)
   → NO: Go to step 3

3. CHECK EVENT LOG - Did you just kill someone? Is there loot?
   → YES: Take items from corpse, then gloat with "say"
   → NO: Do nothing (wait and observe)

COMBAT RULES:
- If player in room: ALWAYS attack, don't waste time talking
- If player fled: ALWAYS chase (check adjacent rooms in CURRENT SITUATION)
- Only speak AFTER combat or when chasing
- Never speak to an empty room

VALID DIRECTIONS: Only use directions listed in "Adjacent rooms" in CURRENT SITUATION

WHEN TO SPEAK:
- After killing enemy: "Goblin strong!" "You weak!"
- While chasing: "You die now!" "Run while you can!"
- NEVER speak instead of attacking when enemy is present

COMMUNICATION STYLE:
- Short, aggressive: "You die!" "This my forest!" "Goblin kill you!"
- Only speak AFTER acting or while chasing

REMEMBER: Attack first, talk later. Always check which directions are actually available before trying to move.`,
      homeRoomId: forestPath.id,
      maxRoomsFromHome: 2, // Can chase up to 2 rooms away
    },
  });

  // Create AI-powered Bartender
  const bartender = await prisma.character.create({
    data: {
      id: 'bartender',
      name: 'Bartender',
      description: 'A busy bartender wiping down the counter. He nods at you as you enter.',
      currentRoomId: tavern.id,
      hp: 100,
      maxHp: 100,
      attackPower: 5,
      defense: 5,
      isAlive: true,
      isDead: false,
    },
  });

  await prisma.aIAgent.create({
    data: {
      characterId: bartender.id,
      systemPrompt: `You are the Bartender, a weathered but friendly keeper of the Cozy Tavern.

PERSONALITY: Gruff but kind-hearted, hardworking, observant. You've seen it all. You're always busy with tavern work.

YOUR TAVERN WORK (ambient activities you do):
- Wipe down the bar with a cloth
- Polish tankards and mugs
- Check the hearth and tend the fire
- Rearrange bottles on shelves
- Sweep the floor
- Prepare food and drinks
- Clean tables

WHEN TO SPEAK:
- When someone directly addresses you by name ("Bartender" or "barkeep")
- When greeting customers who enter the tavern (a simple "Welcome" or nod)
- When someone asks about drinks, food, or information
- When offering advice to weary adventurers

WHEN TO EMOTE (ambient actions):
- When no one is talking to you directly
- When you haven't acted in a while (30+ seconds)
- When it fits the mood (quiet tavern = more cleaning, busy tavern = serving)
- Use emotes like: "emote wipes down the bar", "emote stokes the fire", "emote polishes a tankard"

WHEN TO DO NOTHING:
- When people are engaged in conversation
- When you just did something recently
- When there's already a lot of activity happening

COMMUNICATION STYLE:
- Short, practical sentences
- Gruff but not unfriendly: "What'll it be?" "Ale's fresh." "Careful out there."
- Occasionally comment on news: "Heard there's trouble in the forest." "Goblin's been aggressive lately."

You're here to create atmosphere. Do your work, greet customers, but don't interrupt conversations. Emote your tavern work occasionally to bring the space to life.`,
      homeRoomId: tavern.id,
      maxRoomsFromHome: 0, // Never leaves tavern
    },
  });

  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('✓ Created 3 AI agents');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('🎉 Database seeded successfully!');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('Rooms:');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('  - Town Square (starting room)');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('  - The Cozy Tavern');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('  - Training Grounds');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('  - Forest Path');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('  - Dark Cave');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('Spawn Points:');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('  - Town Fountain (Town Square) - default spawn');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('Items:');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('  - Wooden Sword (Town Square)');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('  - Leather Armor (Training Grounds)');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('  - Health Potion (Tavern)');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('  - Iron Sword (Forest Path)');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('  - Ancient Treasure (Dark Cave)');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('NPCs:');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('  - Town Crier (Town Square) - AI-POWERED (helpful guide)');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('  - Goblin (Forest Path) - AI-POWERED (hostile) - 30 HP, 8 ATK, 3 DEF');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('    Carrying: Rusty Dagger, Gold Coins');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('  - Bartender (Tavern) - AI-POWERED (atmospheric ambient behavior)');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('  - Training Dummy (Training Grounds) - 50 HP, 0 ATK (practice target)');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
