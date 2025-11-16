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
      }),
    },
  });

  // biome-ignore lint/suspicious/noConsole: Seed script needs console output
  console.log('✓ Created 5 rooms');

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
  console.log('  - Goblin (Forest Path) - 30 HP, 8 ATK, 3 DEF');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('    Carrying: Rusty Dagger, Gold Coins');
  // biome-ignore lint/suspicious/noConsole: Seed script output
  console.log('  - Training Dummy (Training Grounds) - 50 HP, 0 ATK');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
