# Tick-Based Game Loop - Design Document

## Problem with Current System

**Unfair timing:**
- Players can spam commands instantly
- AI waits 10 seconds between actions
- Combat has 2-second cooldown but timing is inconsistent
- Race conditions possible

## Tick-Based Solution

### Core Concept

**Tick = 1 second game loop iteration**

Every tick:
1. Collect all pending actions (players + AI)
2. Validate actions (cooldowns, legality)
3. Execute actions simultaneously
4. Broadcast results
5. Wait for next tick

### Cooldowns in Ticks

```typescript
const COOLDOWNS = {
  attack: 2,      // 2 ticks = 2 seconds
  move: 0,        // Instant
  say: 0,         // Instant
  take: 0,        // Instant
  ai_response: 3, // AI waits 3 ticks between responses
  ai_action: 10,  // AI waits 10 ticks between proactive actions
};
```

### Architecture

```typescript
class GameLoop {
  private tickInterval = 1000; // 1 second per tick
  private currentTick = 0;
  
  start() {
    setInterval(() => {
      this.processTick();
    }, this.tickInterval);
  }
  
  async processTick() {
    this.currentTick++;
    
    // 1. Collect pending player commands
    const playerActions = this.collectPlayerCommands();
    
    // 2. AI decisions (every 10 ticks)
    if (this.currentTick % 10 === 0) {
      const aiActions = await this.collectAIActions();
      playerActions.push(...aiActions);
    }
    
    // 3. Execute all actions
    for (const action of playerActions) {
      if (this.canAct(action.actor, action.command)) {
        await this.executeAction(action);
      }
    }
    
    // 4. Results already broadcast via normal flow
  }
}
```

### Benefits

✅ **Fair:** Everyone acts on same cadence
✅ **Predictable:** Cooldowns in whole seconds
✅ **Scalable:** Batched processing
✅ **Balanced:** Easy to tune (increase attack cooldown = slower combat)
✅ **No exploits:** Can't spam faster than tick rate

### Implementation Plan

**Phase 1: Command Queue (Low Risk)**
- Queue player commands instead of executing immediately
- Process queue every tick
- No gameplay changes yet

**Phase 2: Tick-Based Cooldowns**
- Convert cooldowns from milliseconds to ticks
- Track last action tick (not timestamp)
- Validate on tick boundary

**Phase 3: Simultaneous Resolution**
- Collect all actions in tick
- Resolve conflicts (two people take same item)
- Execute in priority order

### Migration Strategy

**Option A: Big Bang (Risky)**
- Convert everything at once
- High risk of bugs

**Option B: Gradual (Safe)**
1. Add tick counter
2. Queue commands (process immediately for now)
3. Convert cooldowns to ticks
4. Add batched processing
5. Remove immediate processing

**Recommendation: Option B** - ship working game, iterate

### Current vs Tick-Based

| Aspect | Current | Tick-Based |
|--------|---------|------------|
| Player action | Instant | Next tick (max 1s delay) |
| AI action | 10s interval | Every 10th tick |
| Attack cooldown | 2000ms | 2 ticks |
| Fairness | Player advantage | Equal |
| Exploits | Possible | Prevented |
| Complexity | Low | Medium |

### Do We Need This Now?

**Arguments FOR:**
- Fairness matters for PvP
- AI Goblin combat needs balance
- Foundation for complex combat

**Arguments AGAINST:**
- Current system works
- Not blocking any features
- Can add later without breaking changes

### Recommendation

**Add tick system LATER (Iteration 6-7)**

Reasons:
1. Current AI system just shipped (test first!)
2. No PvP combat yet (only PvE)
3. Can add without breaking changes
4. Focus on content/features first

**For now:**
- Ship what we have
- Test AI Goblin behavior
- Gather feedback
- Add ticks when we need complex combat

---

## If We Do It Now

Minimal implementation (~2 hours):

```typescript
// 1. Add tick counter
class GameEngine {
  private currentTick = 0;
  private tickTimer?: NodeJS.Timeout;
  
  startGameLoop() {
    this.tickTimer = setInterval(() => {
      this.currentTick++;
      this.processTick();
    }, 1000);
  }
  
  private async processTick() {
    // Process queued commands
    await this.processPlayerCommands();
    
    // Every 10 ticks: AI acts
    if (this.currentTick % 10 === 0) {
      await this.aiAgentManager.processProactiveActions();
    }
  }
}

// 2. Queue instead of execute
handleCommand(socketId, command) {
  this.commandQueue.push({ socketId, command, tick: this.currentTick });
}

// 3. Process queue on tick
async processPlayerCommands() {
  const commands = this.commandQueue;
  this.commandQueue = [];
  
  for (const cmd of commands) {
    await this.executeCommand(cmd);
  }
}
```

**Should we implement this now or ship what we have?**

