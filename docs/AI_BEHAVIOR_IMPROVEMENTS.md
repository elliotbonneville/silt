# AI Behavior Improvements - Working Document

## Current System Overview

### Architecture (as of current implementation)

**Proactive Decision Loop:**
- Runs every 10 seconds
- Checks all AI agents
- For each agent:
  - Filters: Must be in room with players
  - Filters: Must have passed MIN_RESPONSE_COOLDOWN_MS (3 seconds)
  - Filters: Must have queued events
  - LLM decides action based on: system prompt, recent events, relationships, time since last action
  - Executes chosen action through command system

**Event Queue:**
- AI agents receive ALL game events (except room_description and their own actions)
- Events stored in 30-second rolling window
- Events are pre-formatted with agent's perspective

**Available Actions:**
AI can use these commands via LLM tool calls:
- `look` - observe surroundings
- `go <direction>` - move to adjacent room
- `say <message>` - speak to room
- `emote <action>` - perform action/emote
- `attack <target>` - attack a target
- `take <item>` - pick up item
- `drop <item>` - drop item
- `examine <item>` - examine item
- `equip <item>` - equip weapon/armor

---

## Problem 1: Town Crier Talks Too Much

### Current Behavior
Town Crier generates new speech events frequently, even when not addressed.

### Root Causes
1. **Event Queue Always Has Content**: Every action in room creates events
2. **Decision Prompt Doesn't Emphasize Restraint**: Current prompt says "Don't spam actions" but doesn't provide clear guidelines
3. **No Concept of "Addressed vs Ambient"**: System doesn't distinguish between being directly addressed and just witnessing events
4. **Personality Conflict**: Town Crier is "chatty" but we want him selective

### Diagnosis Questions
- [ ] Does Town Crier respond to EVERY event or just some?
- [ ] What's the actual frequency of his responses? (every 10s? every 30s?)
- [ ] Does he respond when alone in room with no players?
- [ ] What types of events trigger his responses most?

### Proposed Solutions

#### Option A: Personality-Based Response Thresholds
Add to AI agent schema:
```typescript
interface AIAgent {
  responseThreshold: 'always' | 'when_addressed' | 'dramatic_only' | 'silent';
  chattiness: number; // 0-10, affects probability of unsolicited responses
}
```

Town Crier: `responseThreshold: 'when_addressed', chattiness: 3`
- Responds when name mentioned
- Responds to questions in small groups (2-3 people)
- 30% chance to comment on dramatic events (deaths, victories)
- Otherwise stays quiet

#### Option B: Event Significance Scoring
Filter events by significance:
```typescript
function getEventSignificance(event: GameEvent): number {
  const scores = {
    death: 10,
    combat_start: 7,
    player_entered: 5,
    speech_addressed_to_me: 9,
    speech_question: 6,
    speech_casual: 2,
    movement: 1,
    item_pickup: 1,
  };
  // Town Crier only responds to events with significance >= 5
}
```

#### Option C: Improved Decision Prompt
Enhance the prompt in `decision-service.ts`:
```typescript
const prompt = `You are ${agentName}. ${agentPersonality}

Recent events you witnessed:
${recentEvents}

YOUR BEHAVIOR RULES:
- ONLY speak when:
  1. Someone directly addresses you by name
  2. Someone asks a question and you're the appropriate person to answer
  3. A dramatic event occurs (death, major victory)
- DO NOT speak when:
  1. People are having a private conversation
  2. You just spoke less than 30 seconds ago
  3. The event is mundane (someone picking up items, moving around)
  4. You have nothing important to add

Remember: Quality over quantity. Silence is better than unnecessary chatter.

Should you act? If so, what should you do?`;
```

#### **RECOMMENDED APPROACH**: Combination of B + C
1. Add event significance scoring to filter noise
2. Improve prompt to emphasize selective responses
3. For Town Crier specifically: only respond to significance >= 6 events

---

## Problem 2: Goblin Not Following or Talking

### Expected Behavior
- Goblin should be hostile and aggressive
- Should follow players who enter his territory
- Should taunt/threaten players
- Should attack intruders

### Current Behavior
Goblin is not choosing these actions.

### Root Causes (Hypotheses)

#### Hypothesis 1: LLM Not Choosing Actions
**Check:**
- Are `go` and `say` tools being provided to LLM? ✓ (Yes, per command-registry.ts)
- Is the goblin's system prompt clear about desired behavior?
- Does the prompt encourage movement and aggression?

**Current Goblin Prompt:**
```
You are a Goblin, a hostile creature guarding the forest path.
You are aggressive, territorial, and attack intruders on sight.
You patrol between the forest path and your cave, protecting your treasure.

Personality: Hostile, aggressive, territorial. You don't talk much - you fight.
Behavior: Attack any adventurers who enter your territory. Pick up weapons you find.

You can move, attack, and occasionally grunt threats. Keep responses short and aggressive.
```

**Issue**: Prompt says "you don't talk much - you fight" which might make LLM choose NOT to talk. But it doesn't explicitly say "follow intruders" or provide tactical guidance.

#### Hypothesis 2: Event Context Not Clear Enough
**Check:**
- When player enters forest-path, does goblin get a clear event?
- Does goblin know player's current location vs goblin's location?
- Does goblin have enough context to decide "I should follow this person"?

**Current Context:**
```typescript
const roomContext = `${roomChars.length} people in room`;
```

**Issue**: This is very sparse! Goblin doesn't know:
- WHO is in the room (just count)
- Where the player went if they left
- Goblin's current location vs home location
- What rooms are adjacent

#### Hypothesis 3: Cooldown Too Restrictive
**Check:**
- If goblin attacks, does 3-second cooldown prevent follow-up?
- If player flees, can goblin respond fast enough?

**Issue**: MIN_RESPONSE_COOLDOWN_MS = 3000 might prevent rapid tactical decisions.

### Proposed Solutions

#### Solution 1: Enhanced Room Context
```typescript
const roomContext = `
You are in: ${character.currentRoomId}
Your home: ${agent.homeRoomId} (max distance: ${agent.maxRoomsFromHome})
People present: ${roomChars.map(c => `${c.name} (${c.isAlive ? 'alive' : 'dead'})`).join(', ')}
Adjacent rooms: ${getAdjacentRooms(character.currentRoomId).join(', ')}
`;
```

This gives goblin:
- Awareness of location
- Knowledge of who to target
- Options for where to move

#### Solution 2: Improved Goblin Prompt
```typescript
systemPrompt: `You are a Goblin warrior guarding the forest path.

PERSONALITY: Aggressive, territorial, cunning. You enjoy intimidating intruders.

TACTICS:
- When adventurers enter your territory: Challenge them with threats ("Back off, human!")
- If they don't leave immediately: Attack them
- If they flee: Chase them if they're within 1 room of your home
- If you're wounded (HP < 50%): Fight more desperately, taunt them
- After killing an intruder: Loot their corpse, gloat over victory

COMMUNICATION:
- Speak in short, aggressive sentences
- Use threats: "You die now!" "This my forest!" "Leave or die!"
- Taunt wounded enemies: "You weak!" "Run while you can!"
- Gloat after victories: "Goblin strong!" "More treasure for me!"

You can use: attack, say, emote, go, take

Available rooms: forest-path (home), dark-cave (nearby)
Stay within 1 room of forest-path.`,
```

#### Solution 3: Action Preference System
Add to decision prompt:
```typescript
const prompt = `You are ${agentName}. ${agentPersonality}

Recent events you witnessed:
${recentEvents}

${roomContext}

PRIORITIES:
${agent.actionPriorities || getDefaultPriorities(agentName)}

Decide what to do. You can:
- Attack threats (HIGH PRIORITY for hostile NPCs)
- Chase fleeing enemies (HIGH PRIORITY if within range)
- Speak (threats, taunts, warnings)
- Pick up useful items
- Move around (patrol or pursue)
- Do nothing (wait and observe)
`;

function getDefaultPriorities(agentName: string): string {
  if (agentName === 'Goblin') {
    return `
1. Attack any intruders in your territory
2. Chase fleeing enemies (if within 1 room of home)
3. Loot corpses and treasure
4. Threaten/taunt intruders
5. Patrol between forest-path and dark-cave
`;
  }
  // ... other agent types
}
```

#### **RECOMMENDED APPROACH**: All Three
1. Enhance room context (Solution 1) - gives AI spatial awareness
2. Improve goblin prompt (Solution 2) - clarifies expected behavior
3. Add priority system (Solution 3) - guides decision-making

---

## Implementation Plan

### Phase 1: Diagnosis (30 minutes)
- [ ] Check AI debug logs - what is Town Crier actually deciding?
- [ ] Check AI debug logs - what is Goblin deciding?
- [ ] Verify event queue contents for each agent
- [ ] Measure actual response frequency

### Phase 2: Event Significance Filtering (1-2 hours)
- [ ] Create event significance scoring function
- [ ] Add significance threshold to AIAgent schema
- [ ] Update AIAgentManager to filter by significance
- [ ] Set Town Crier threshold = 6 (selective)
- [ ] Set Goblin threshold = 3 (reactive)

### Phase 3: Enhanced Context (2-3 hours)
- [ ] Create `buildRoomContext()` function
  - Current room
  - Home room + max distance
  - List of characters present (with status)
  - Adjacent rooms with exits
- [ ] Update decision prompt to use rich context
- [ ] Test that AI receives this info

### Phase 4: Improved Prompts (1 hour)
- [ ] Rewrite Town Crier prompt with restraint emphasis
- [ ] Rewrite Goblin prompt with tactical guidance
- [ ] Add priority/behavior rules to decision prompt template
- [ ] Test with mock responses first

### Phase 5: Testing & Tuning (2-3 hours)
- [ ] Test Town Crier - does he talk less but still respond when addressed?
- [ ] Test Goblin - does he follow and attack?
- [ ] Tune thresholds and prompts based on behavior
- [ ] Verify cooldowns aren't too restrictive

### Phase 6: Documentation (30 minutes)
- [ ] Update AI_ARCHITECTURE.md with new systems
- [ ] Document event significance scores
- [ ] Document agent configuration best practices

**Total Estimated Time: 7-10 hours**

---

## Open Questions for User

### Town Crier Behavior
1. **Desired frequency**: How often SHOULD Town Crier speak?
   - Only when directly addressed by name?
   - When questions are asked in a small group (2-3 people)?
   - Occasionally (10-20% chance) for ambient flavor?

2. **Greeting behavior**: Should Town Crier still greet new players entering town square?
   - Yes, but only once per player per session?
   - Yes, but only if no one else is talking?
   - No, wait for them to approach him?

3. **Context awareness**: Should Town Crier comment on dramatic events?
   - "Oh my! Someone has fallen!" (when witnessing death)
   - "Be careful out there!" (when seeing someone leave injured)
   - Or stay completely silent unless addressed?

### Goblin Behavior
4. **Aggression level**: How should Goblin behave when player enters forest-path?
   - Immediately attack without talking?
   - Threaten first, attack if player doesn't leave?
   - Try to talk/threaten, then attack after 10-20 seconds?

5. **Chase behavior**: Should Goblin pursue fleeing players?
   - Yes, within maxRoomsFromHome (1 room from forest-path)
   - Yes, but give up after 1-2 rooms
   - No, stay in territory and taunt them

6. **Communication style**: How much should Goblin talk?
   - Very little - mostly grunts and one-word threats
   - Short aggressive sentences (current plan)
   - More verbose taunting and threats

### System Design
7. **Response thresholds**: Should we add per-agent response thresholds?
   - Or keep it simple and just improve prompts?

8. **Event significance**: Should significance be:
   - Hardcoded per event type
   - Configurable per agent
   - Dynamic based on AI context?

9. **Cooldown tuning**: Is 3 seconds appropriate?
   - Should combat-oriented NPCs have shorter cooldowns (1s)?
   - Should social NPCs have longer cooldowns (10s)?

---

## Implementation Status

### ✅ COMPLETED

**Enhanced Room Context System** (`ai/context-builder.ts`)
- Created `buildRoomContext()` function that provides rich spatial awareness
- Provides: current location, home location, characters present (with HP/status), adjacent rooms/exits
- Formatted as human-readable context for LLM prompts
- AI now knows WHO is in the room, WHERE they can go, and WHERE they are relative to home

**Improved Decision Prompt** (`ai/decision-service.ts`)
- Added "CURRENT SITUATION" section with rich room context
- Added explicit "DECISION GUIDELINES" with WHEN TO ACT / WHEN TO WAIT sections
- Emphasizes: "Quality over quantity. Choose your moments wisely. It's perfectly fine to do nothing most of the time."
- Removed spam-encouraging language, added restraint emphasis

**Town Crier System Prompt** (seed.ts)
- Rewritten with explicit WHEN TO SPEAK / WHEN TO STAY SILENT sections
- Speaks when: directly addressed, questions asked, greeting arrivals, dramatic events
- Silent when: private conversations, mundane activities, recently spoke
- Emphasizes being helpful but respectful of others' space

**Goblin System Prompt** (seed.ts)
- Completely rewritten with tactical guidance
- Clear tactics: threaten first, then attack, chase within 1 room, loot corpses
- Explicit territory and movement boundaries
- Short aggressive communication style with examples
- WHEN TO ACT section: territorial response, combat, chase, looting

**Bartender NPC** (seed.ts)
- NEW AI-powered NPC in the Cozy Tavern
- Designed for ambient emote behavior (polishing tankards, stoking fire, wiping bar)
- Gruff but friendly personality
- Responds when addressed but mostly provides atmosphere through emotes
- Different behavior profile from Town Crier (action-focused vs conversation-focused)

**Integration Updates**
- AIAgentManager now uses enhanced context builder
- All AI agents get rich spatial/character information for decisions
- System relies on LLM intelligence + better prompts instead of hardcoded event filtering

---

## Testing Instructions

To apply these changes:

1. **Reseed the database:**
   ```bash
   cd packages/server
   npm run db:seed
   ```

2. **Restart the server** to load new AI agent prompts

3. **Test Town Crier:**
   - Enter town square - should greet once
   - Walk around, pick up items - should stay silent
   - Say "hello Town Crier" - should respond
   - Have conversation with another player - should stay silent unless addressed

4. **Test Goblin:**
   - Enter forest path - should threaten you
   - Stay there - should attack
   - Flee to town square - goblin may chase you once
   - Check if goblin uses "say" command to threaten

5. **Test Bartender:**
   - Enter tavern - may greet briefly
   - Wait 30+ seconds - should emote tavern work (wipe bar, tend fire, polish tankards)
   - Say "hello Bartender" - should respond
   - Leave him alone - should continue ambient emotes periodically

---

## Expected Behavior Changes

### Town Crier
**Before:** Talked every 10-13 seconds about any event
**After:** Only speaks when addressed, answering questions, or greeting new arrivals. Mostly silent.

### Goblin  
**Before:** Didn't follow or talk much
**After:** Threatens intruders, attacks after warning, chases fleeing enemies within 1 room, taunts during combat

### Bartender (NEW)
**After:** Provides ambient atmosphere through emotes, responds when addressed, creates living tavern feel

---

## Architecture Notes

The solution uses **LLM-based decision making** rather than hardcoded event significance scoring. The AI is made smarter through:

1. **Rich Context:** Full spatial awareness (location, people, exits, status)
2. **Clear Guidelines:** Explicit WHEN TO ACT / WHEN TO WAIT in prompts
3. **Personality Definition:** Detailed character goals, tactics, and communication style
4. **Example Behaviors:** Concrete examples of desired actions in system prompts

This approach is more flexible and allows the AI to use judgment rather than following rigid rules.

---

---

## Spatial Memory System (NEW)

### Overview
AI agents now have **LLM-encoded spatial memory** - a "mental map" that lets them give detailed directions.

### How It Works

1. **Generation (Once Per Day)**
   - On server startup, the system fetches all rooms within `maxRoomsFromHome + 2` hops
   - LLM processes the room graph and creates a navigable summary
   - Example output: "From Town Square (my home): NORTH → Forest Path (dangerous, goblin territory) → NORTH → Dark Cave (treasure inside) → DOWN → Hidden Grotto"

2. **Storage & Refresh**
   - Stored in database (`AIAgent.spatialMemory`, `spatialMemoryUpdatedAt`)
   - Auto-refreshes if older than 24 hours
   - Initialized on server startup **in background** (doesn't block server)

3. **Usage**
   - Passed to LLM in decision prompt
   - Allows agents to give step-by-step directions
   - Enables answering questions like "Where is the tavern?" with "Go east from here"

### Token Efficiency
- **One-time cost:** ~300-400 tokens per agent per day for generation
- **Per-decision cost:** ~100-200 tokens (the encoded memory)
- **Benefit:** Scales to thousands of rooms without querying map data every decision

### Example Usage

```
Player: "Town Crier, how do I get to the cave?"
Town Crier: "Go north to the Forest Path, then continue north to the Dark Cave. Watch out for the goblin!"
```

### Implementation Files
- `ai/spatial-memory.ts` - BFS pathfinding, LLM encoding, refresh logic
- Schema: Added `spatialMemory` and `spatialMemoryUpdatedAt` to `AIAgent` model
- AIAgentManager: `initializeSpatialMemory()` called on server startup
- Decision prompts include spatial memory context

---

## Next Steps

### To Apply All Changes:

1. **Create database migration:**
   ```bash
   cd packages/server
   npx prisma migrate dev --name add_spatial_memory_to_ai_agents
   ```

2. **Reseed the database:**
   ```bash
   npm run db:seed
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```
   - Server starts immediately
   - Spatial memory generation runs in background (takes 10-30 seconds)
   - Watch logs for "✅ Spatial memory initialization complete"
   - Agents work immediately but can't give directions until spatial memory loads

### What to Test:

**Town Crier (spatial memory test):**
- Say "Town Crier, where is the tavern?" - should give directions: "Go east from here"
- Say "Town Crier, how do I get to the cave?" - should give multi-step path: "Go north to Forest Path, then north to Dark Cave"
- Ask about dangerous areas - should warn about goblin territory

**Goblin (behavior test):**
- Enter forest path - should threaten you
- Stay there - should attack
- Check if goblin follows when you flee

**Bartender (ambient test):**
- Enter tavern - may greet briefly
- Wait 30+ seconds - should emote tavern work
- Say "hello Bartender" - should respond

---

## Simulation Philosophy: Event-Driven Intelligence

### Decision: Remove "Players in Room" Filter

**Problem:** Agents only acted when players were in their current room, which prevented:
- Chase behavior (Goblin can't follow fleeing players)
- Patrol behavior (can't move when alone)
- Any autonomous action without direct observation

**Solution Implemented:** Trust event queue + LLM judgment
- Removed `hasPlayers` filter from proactive loop
- Agents now act whenever they have events in queue (regardless of player presence)
- Event queue naturally expires after 30 seconds (prevents stale actions)
- LLM decides based on personality/prompts if events warrant action

**Why This Works:**
1. **Flavor events** only fire when players present (natural gating)
2. **Pursuit events** (player fled) stay in queue, enabling chase
3. **LLM prompts** already emphasize restraint ("only act when important")
4. **30-second timeout** prevents acting on stale information
5. **Cost-controlled** by event propagation (no events = no API calls)

**Example - Goblin Chase:**
```
1. Player enters Forest Path → Goblin gets "player_entered" event
2. Player flees north → Goblin gets "movement: Player went north" event
3. 10 seconds later, proactive loop runs
4. Goblin is alone BUT has events: ["player entered", "player fled north"]
5. LLM sees personality ("chase within 1 room") + events
6. Goblin decides: "go north" (pursuit!)
```

**Philosophy:** 
We simulate what matters for player experience (intelligent reactions, persistence, memory) without simulating what doesn't (idle behavior in empty rooms). Events drive simulation, not continuous polling.

---

**Awaiting user testing and feedback on AI behavior.**


