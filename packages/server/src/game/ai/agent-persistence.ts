import type { AIAgent } from '@prisma/client';
import type { GameEvent } from '@silt/shared';
import { findAllAIAgents, updateAIAgent } from '../../database/index.js';

/**
 * Load all AI agents from database and restore event queues
 */
export async function loadAgentsWithQueues(): Promise<{
  agents: AIAgent[];
  queues: Map<string, GameEvent[]>;
}> {
  const agents = await findAllAIAgents();
  const queues = new Map<string, GameEvent[]>();

  // Restore event queues from database
  for (const agent of agents) {
    try {
      // Check if new field exists (will after migration)
      const agentRecord: Record<string, unknown> = agent;
      const eventQueueJson = agentRecord['eventQueueJson'];

      if (typeof eventQueueJson === 'string') {
        const storedEvents: unknown = JSON.parse(eventQueueJson);
        if (Array.isArray(storedEvents)) {
          // Filter to events with required fields, TypeScript will accept this
          const validEvents = storedEvents.filter(
            (e): e is GameEvent =>
              e !== null &&
              typeof e === 'object' &&
              'id' in e &&
              'type' in e &&
              'timestamp' in e &&
              'originRoomId' in e &&
              'visibility' in e,
          );
          queues.set(agent.characterId, validEvents);
        }
      }
    } catch (error) {
      console.error(`Failed to restore event queue for agent ${agent.id}:`, error);
    }
  }

  return { agents, queues };
}

/**
 * Save event queues to database
 */
export async function saveEventQueues(queues: Map<string, GameEvent[]>): Promise<void> {
  for (const [characterId, queue] of queues.entries()) {
    try {
      const agents = await findAllAIAgents();
      const agent = agents.find((a) => a.characterId === characterId);
      if (agent) {
        const updates: Record<string, unknown> = {
          eventQueueJson: JSON.stringify(queue),
        };
        await updateAIAgent(agent.id, updates);
      }
    } catch (error) {
      console.error(`Failed to save event queue for character ${characterId}:`, error);
    }
  }
}
