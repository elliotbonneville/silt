import { findAllAIAgents, findCharacterById, updateAIAgent } from '../../database/index.js';
import type { AIService } from './index.js';
import { refreshAgentSpatialMemory } from './index.js';

/**
 * Initialize spatial memory for all agents (runs in background)
 * Should be called on server startup (non-blocking)
 */
export async function initializeSpatialMemory(aiService: AIService): Promise<void> {
  console.info('🗺️  Initializing spatial memory for AI agents (background task)...');
  const agents = await findAllAIAgents();

  for (const agent of agents) {
    const character = await findCharacterById(agent.characterId);
    if (!character) {
      console.warn(`⚠️  Character not found for agent ${agent.id}`);
      continue;
    }

    try {
      // Check if spatial memory needs refresh (older than 24 hours)
      const hoursSinceUpdate =
        (Date.now() - agent.spatialMemoryUpdatedAt.getTime()) / (1000 * 60 * 60);

      if (!agent.spatialMemory || hoursSinceUpdate > 24) {
        console.info(`   🔄 ${character.name}: Generating spatial memory...`);
        const spatialMemory = await refreshAgentSpatialMemory(aiService, agent, character.name);

        await updateAIAgent(agent.id, {
          spatialMemory,
          spatialMemoryUpdatedAt: new Date(),
        });

        console.info(`   ✓ ${character.name}: Spatial memory ready`);
      } else {
        console.info(`   ✓ ${character.name}: Spatial memory up to date (cached)`);
      }
    } catch (error) {
      console.error(`   ✗ ${character.name}: Failed to initialize spatial memory:`, error);
      console.error(`      Agent will function without spatial memory (cannot give directions)`);
    }
  }

  console.info('✅ Spatial memory initialization complete\n');
}
