/**
 * Spatial memory - LLM-based map encoding for AI agents
 * Agents periodically (e.g., daily) process nearby rooms and create a mental map
 */

import type { AIAgent } from '@prisma/client';
import type OpenAI from 'openai';
import { findRoomById } from '../../database/index.js';

interface RoomInfo {
  id: string;
  name: string;
  description: string;
  exits: Record<string, string>;
}

/**
 * Fetch rooms within N hops of a starting room (BFS)
 */
export async function getRoomsWithinDistance(
  startRoomId: string,
  maxDistance: number,
): Promise<Map<string, { room: RoomInfo; distance: number }>> {
  const visited = new Map<string, { room: RoomInfo; distance: number }>();
  const queue: Array<{ roomId: string; distance: number }> = [{ roomId: startRoomId, distance: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    const { roomId, distance } = current;

    // Skip if already visited or too far
    if (visited.has(roomId) || distance > maxDistance) continue;

    // Fetch room from database
    const dbRoom = await findRoomById(roomId);
    if (!dbRoom) continue;

    const exits: Record<string, string> = JSON.parse(dbRoom.exitsJson);
    const room: RoomInfo = {
      id: dbRoom.id,
      name: dbRoom.name,
      description: dbRoom.description,
      exits,
    };

    visited.set(roomId, { room, distance });

    // Add adjacent rooms to queue
    for (const targetRoomId of Object.values(exits)) {
      if (!visited.has(targetRoomId)) {
        queue.push({ roomId: targetRoomId, distance: distance + 1 });
      }
    }
  }

  return visited;
}

/**
 * Generate spatial memory using LLM
 * LLM creates a navigable "mental map" from nearby room data
 */
export async function generateSpatialMemory(
  client: OpenAI,
  agent: AIAgent,
  agentName: string,
  nearbyRooms: Map<string, { room: RoomInfo; distance: number }>,
): Promise<string> {
  // Format rooms for LLM - include full graph structure
  const roomsList = Array.from(nearbyRooms.entries())
    .sort((a, b) => a[1].distance - b[1].distance) // Sort by distance
    .map(([_id, { room, distance }]) => {
      const exitsList = Object.entries(room.exits)
        .map(([dir, target]) => {
          const targetRoom = nearbyRooms.get(target);
          const targetName = targetRoom?.room.name || 'Unknown';
          return `${dir} → ${targetName}`;
        })
        .join(', ');

      return `• ${room.name} (${distance} room${distance === 1 ? '' : 's'} away)
  Brief: ${room.description.slice(0, 80)}...
  Exits: ${exitsList || 'none'}`;
    })
    .join('\n\n');

  const prompt = `You are ${agentName}. Here is a map of locations within ${agent.maxRoomsFromHome} rooms of your home.

ROOM NETWORK (with directions):
${roomsList}

YOUR TASK:
Create a CONCISE navigable map showing paths FROM YOUR HOME (${agent.homeRoomId}). 

RULES:
1. Start from your home location only
2. Show direct paths using arrow notation: NORTH → Forest Path → NORTH → Dark Cave
3. Include brief warnings (dangerous, safe, has items)
4. Maximum 5-7 lines total
5. Only include locations within your range

EXAMPLE FORMAT:
"NORTH → Forest Path (goblin territory) → NORTH → Dark Cave (treasure, dangerous) → DOWN → Hidden Grotto
EAST → Cozy Tavern (safe, healing potions)
WEST → Training Grounds (practice combat)
Dark Cave connects NORTHEAST → Mountain Peak → SOUTHEAST → Rocky Ledge"

Write your concise mental map (5-7 lines max):`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 200, // Reduced for concise output
    temperature: 0.5, // Lower for more consistent structure
  });

  const spatialMemory = response.choices[0]?.message?.content || '';
  return spatialMemory.trim();
}

/**
 * Refresh spatial memory for an agent
 * This should be called infrequently (e.g., once per day or on server restart)
 */
export async function refreshAgentSpatialMemory(
  aiService: { client: OpenAI },
  agent: AIAgent,
  agentName: string,
): Promise<string> {
  console.info(`🗺️  Refreshing spatial memory for ${agentName}...`);

  // Fetch nearby rooms (home + maxRoomsFromHome distance)
  const nearbyRooms = await getRoomsWithinDistance(
    agent.homeRoomId,
    agent.maxRoomsFromHome + 2, // Add 2 extra hops for context
  );

  console.info(`   Found ${nearbyRooms.size} rooms within range`);

  // Generate mental map
  const spatialMemory = await generateSpatialMemory(
    aiService.client,
    agent,
    agentName,
    nearbyRooms,
  );

  console.info(`   ✓ Generated spatial memory (${spatialMemory.length} chars)`);

  return spatialMemory;
}
