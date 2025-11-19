# AI Attention System

## Problem
The current AI system polls every 10 seconds. This causes:
1.  **High Latency:** Agents take up to 10s to reply to "Hello".
2.  **Unresponsiveness:** Fast-paced events (combat) feel disjointed.

## Solution: Event-Driven Attention
Instead of fixed polling, agents react to **Stimuli** with dynamic priority scheduling.

### 1. Stimulus Types & Reaction Times

| Stimulus | Priority | Reaction Delay | Example |
|:---|:---|:---|:---|
| **Combat** | Critical | 0.5s - 1.5s | `combat_start`, `combat_hit` |
| **Death** | Critical | 0.5s - 1.0s | `death` (someone dies) |
| **Direct Speech** | High | 1.0s - 2.5s | Speech containing agent's name (TODO) |
| **Room Speech** | Medium | 3.0s - 5.0s | Any `speech` event |
| **Movement** | Medium | 3.0s - 5.0s | Player enters/leaves |
| **Shout** | Low | 5.0s - 10s | Distant speech |
| **Idle** | Very Low | 45s - 90s | No events, boredom emote |

### 2. The Attention System

**When an event arrives** (`queueEventForAgent`):
1.  Calculate `reactionDelay` based on event type (see table above).
2.  Schedule processing: `nextProcessingTime = now + reactionDelay`.
3.  **Priority Rule:** If already scheduled, keep the *earliest* time (higher priority wins).

**Every Game Tick** (`processAttentionQueue`):
1.  Find agents where `now >= nextProcessingTime` and `cooldown` has expired.
2.  Limit concurrency: Max 2 LLM requests at once.
3.  Sort by priority (earliest scheduled time first).
4.  Process top N agents.

### 3. Idle Behavior
If an agent receives no events for `IDLE_CHECK_INTERVAL` (45s), they trigger a self-check to potentially wander or emote.
- **Restriction:** Only one idle check per interval (don't spam).
- **Skip:** If agent acted recently (< 45s), ignore idle trigger.

### 4. Emotes vs. Reactions
- **Emotes** are triggered by idle timeout (low frequency, 45s+).
- **Reactions** are triggered by events (variable frequency based on priority).
- The LLM receives the same context but can choose to emote, speak, or move based on recent events.

## Implementation Details

### In-Memory State (AIAgentManager)
```typescript
interface AgentRuntimeState {
  nextProcessingTime: number; // Timestamp when agent should be processed
  isProcessing: boolean;      // True if LLM call in flight
  lastProcessedAt: number;    // Timestamp of last processing (for cooldown)
}
```

### Constants
```typescript
EVENT_CONTEXT_WINDOW_MS = 90000;    // 90s memory of recent events
IDLE_CHECK_INTERVAL_MS = 45000;     // 45s idle timeout
MAX_CONCURRENT_REQUESTS = 2;        // Max 2 LLM calls at once
// Note: No cooldown! Event delays provide natural pacing.
```

### Future Improvements
1.  **Name Detection:** Check if agent's name appears in speech (currently all speech = medium priority).
2.  **Context-Aware Emotes:** Pass `"idle"` flag to LLM for low-key actions.
3.  **Dynamic Priority:** Agents in combat should react faster to *all* events.

## Benefits
*   **Snappy:** Replies to combat/chat in 1-2s.
*   **Efficient:** Doesn't poll inactive agents.
*   **Dynamic:** Combat feels faster than casual conversation.
*   **Natural:** Randomized delays (0.5-5s) feel organic.

### 5. Active States (Combat Loop)
To prevent agents from stopping mid-combat, we track an `inCombat` state.
- **Trigger:** `combat_start` or `combat_hit` event.
- **Behavior:** Forces processing every 2s (ignoring standard event delays).
- **Context:** Injects `[COMBAT ACTIVE]` into the prompt.
- **Exit:** 10s without combat events.

