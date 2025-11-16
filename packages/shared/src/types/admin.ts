/**
 * Admin dashboard types for monitoring and debugging
 */

import type { GameEvent } from './events.js';

/**
 * AI decision log entry
 */
export interface AIDecisionLog {
  readonly id: string;
  readonly timestamp: number;
  readonly agentId: string;
  readonly agentName: string;
  readonly eventType: 'decision' | 'action' | 'error';
  readonly data: {
    readonly queuedEvents?: readonly string[];
    readonly timeSinceLastAction?: number;
    readonly roomContext?: string;
    readonly action?: string;
    readonly arguments?: Record<string, unknown>;
    readonly reasoning?: string;
    readonly result?: string;
    readonly error?: string;
  };
}

/**
 * Enhanced game event with metadata for admin view
 */
export interface AdminGameEvent extends GameEvent {
  readonly recipients?: readonly string[]; // Who received this event
  readonly formattedFor?: Record<string, string>; // Per-recipient formatting
}

/**
 * Event filter options
 */
export interface EventFilter {
  readonly eventTypes?: readonly string[];
  readonly actorIds?: readonly string[];
  readonly roomIds?: readonly string[];
  readonly startTime?: number;
  readonly endTime?: number;
  readonly searchText?: string;
}
