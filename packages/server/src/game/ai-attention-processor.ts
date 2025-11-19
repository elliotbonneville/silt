/**
 * AI Attention Processor - handles agent scheduling and attention queue
 */

import type { AIAgent } from '@prisma/client';
import type { GameEvent } from '@silt/shared';
import { findAllAIAgents } from '../database/index.js';

const EVENT_CONTEXT_WINDOW_MS = 90000; // Keep events for 90 seconds
const IDLE_CHECK_INTERVAL_MS = 45000; // Check for idle behavior every 45s
const MAX_CONCURRENT_REQUESTS = 5; // Max concurrent LLM calls

export interface AgentRuntimeState {
  nextProcessingTime: number;
  isProcessing: boolean;
  lastProcessedAt: number;
  inCombat: boolean;
  lastCombatEventAt: number;
}

export class AIAttentionProcessor {
  private agentStates = new Map<string, AgentRuntimeState>();

  /**
   * Get or create runtime state for an agent
   */
  getAgentState(agentId: string): AgentRuntimeState {
    let state = this.agentStates.get(agentId);
    if (!state) {
      state = {
        nextProcessingTime: Date.now() + Math.random() * 10000, // Stagger start
        isProcessing: false,
        lastProcessedAt: Date.now(),
        inCombat: false,
        lastCombatEventAt: 0,
      };
      this.agentStates.set(agentId, state);
    }
    return state;
  }

  /**
   * Process agents that are ready to act based on attention/time
   */
  async processAttentionQueue(decisionCallback: (agent: AIAgent) => Promise<void>): Promise<void> {
    const now = Date.now();
    const agents = await findAllAIAgents();
    let activeRequests = 0;

    // Count active requests
    for (const state of this.agentStates.values()) {
      if (state.isProcessing) activeRequests++;
    }

    if (activeRequests >= MAX_CONCURRENT_REQUESTS) return;

    // Find eligible agents
    const eligibleAgents = agents.filter((agent) => {
      const state = this.getAgentState(agent.characterId);
      if (state.isProcessing) return false;

      // Check combat state timeout (10s without combat event)
      if (state.inCombat && now - state.lastCombatEventAt > 10000) {
        state.inCombat = false;
      }

      // If in combat, force action every 2 seconds (unless on cooldown)
      if (state.inCombat) {
        if (now - state.lastProcessedAt >= 2000) {
          state.nextProcessingTime = now;
          return true;
        }
        return false;
      }

      // Check scheduled time
      if (now >= state.nextProcessingTime) return true;

      // Check idle timeout (only if no recent activity)
      const timeSinceLastProcessed = now - state.lastProcessedAt;
      if (
        timeSinceLastProcessed > IDLE_CHECK_INTERVAL_MS &&
        timeSinceLastProcessed < IDLE_CHECK_INTERVAL_MS * 2
      ) {
        // Only trigger idle once per interval (don't spam)
        state.nextProcessingTime = now;
        return true;
      }

      return false;
    });

    // Sort by priority (overdue time)
    eligibleAgents.sort((a, b) => {
      const stateA = this.getAgentState(a.characterId);
      const stateB = this.getAgentState(b.characterId);
      return stateA.nextProcessingTime - stateB.nextProcessingTime;
    });

    // Process top N agents
    for (const agent of eligibleAgents) {
      if (activeRequests >= MAX_CONCURRENT_REQUESTS) break;

      const state = this.getAgentState(agent.characterId);
      state.isProcessing = true;
      activeRequests++;

      // Run decision logic (non-blocking for the loop)
      decisionCallback(agent)
        .catch((err) => console.error(`Error processing agent ${agent.characterId}:`, err))
        .finally(() => {
          state.isProcessing = false;
          state.lastProcessedAt = Date.now();
          // Schedule next idle check
          state.nextProcessingTime = Date.now() + IDLE_CHECK_INTERVAL_MS;
        });
    }
  }

  /**
   * Update event queues after agent receives events
   */
  updateEventQueue(
    agentId: string,
    agentEventQueues: Map<string, GameEvent[]>,
    agentOutputQueues: Map<string, Array<{ timestamp: number; text: string }>>,
  ): void {
    const now = Date.now();
    const cutoffTime = now - EVENT_CONTEXT_WINDOW_MS;

    // Trim old events
    const events = agentEventQueues.get(agentId) || [];
    agentEventQueues.set(
      agentId,
      events.filter((e) => e.timestamp >= cutoffTime),
    );

    // Trim old outputs
    const outputs = agentOutputQueues.get(agentId) || [];
    agentOutputQueues.set(
      agentId,
      outputs.filter((o) => o.timestamp >= cutoffTime),
    );
  }
}
