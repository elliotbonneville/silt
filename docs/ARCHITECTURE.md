# Architecture Documentation

## Core Principles

### 1. Event-Driven Everything
**All game state changes flow through events.** This is non-negotiable.

**Why:**
- Enables range-based propagation (hear combat from adjacent rooms)
- AI agents receive events and react
- Admins can monitor everything
- Complete audit trail
- Replay capability
- Client-agnostic (text UI, visual admin UI, future mobile)

**How:**
```typescript
// Game code generates events
const event = { type: 'combat', originRoomId, ... };

// Event system handles distribution
await eventSystem.broadcast(event);

// Players receive via WebSocket
// AI agents receive via event queue
// Admins receive via admin channel
```

**Anti-pattern:**
```typescript
// ❌ NEVER directly update UI or send to specific players
socket.emit('message', text);  // Wrong!

// ✅ ALWAYS generate events
eventSystem.broadcast(event);  // Right!
```

### 2. Actor-Based Event Propagation (Not Socket.io Rooms)
**Events target specific actors, not broadcast channels.**

**Why:**
- Scales to 1000+ players (only send to affected actors)
- AI agents can hear events (they don't have sockets)
- Range-based propagation (BFS on room graph)
- Flexible attenuation (distant events sound different)

**How it works:**
1. Game generates event with `originRoomId` and `type`
2. EventPropagator uses BFS to find rooms within range
3. For each room, get all actors (players + AI agents)
4. EventDeliverySystem sends to players (socket) or AI agents (queue)

**Critical:** This must be in Iteration 0. Refactoring later is extremely painful.

### 3. Game Engine Returns Data, Never Text
**The engine is client-agnostic.**

**Why:**
- Same engine serves text player UI and visual admin UI
- Testing doesn't depend on string formatting
- Localization possible
- Different clients can render differently

**How:**
```typescript
// ✅ GOOD: Engine returns structured data
return {
  success: true,
  events: [
    { type: 'movement', data: { fromRoom, toRoom, direction } }
  ]
};

// ❌ BAD: Engine returns formatted text
return {
  success: true,
  message: "You move north to Forest Path."
};
```

**Clients decide rendering:**
- Player client → Renders as text
- Admin client → Updates map visualization
- Future mobile client → Whatever it wants

### 4. No Build Step (Path Mappings Only)
**TypeScript resolves `@silt/shared` via path mappings, not compilation.**

**Why:**
- Faster development (no watching/rebuilding)
- Simpler mental model
- Type errors in real-time
- One less thing to break

**How:**
```json
// tsconfig.json
{
  "baseUrl": "../..",
  "paths": {
    "@silt/shared": ["packages/shared/src/index.ts"]
  }
}
```

**Never:**
- Build shared package
- Reference dist folders
- Use tsc --build
- Set up watch tasks

### 5. Strict Type Safety (Zero Escape Hatches)
**No `any`, `as`, `!`, or `@ts-ignore` - ever.**

**Why in a multiplayer game:**
- Type errors crash the server → all players disconnected
- Corrupt character data → permanent loss (permadeath)
- Security vulnerabilities → players exploit
- AI agents break → immersion destroyed

**How to handle "I don't know the type":**
```typescript
// ❌ WRONG
function process(value: any) { ... }

// ✅ RIGHT  
function process(value: unknown) {
  if (typeof value === 'string') {
    return value.toUpperCase();
  }
  throw new Error('Expected string');
}
```

---

## System Architecture

### Monorepo Organization

```
packages/
  shared/       # Types, constants, utils (client + server)
  server/       # Game engine, API, event system
  client/       # React UI (player text interface + admin visual interface)
```

**Rules:**

**Add to `shared` when:**
- ✅ Both client and server need it
- ✅ Type definitions (GameEvent, Character, Room)
- ✅ Constants (EVENT_RANGES, GAME_CONSTANTS)
- ✅ Utility functions (type guards, validators)
- ✅ Branded types (CharacterId, RoomId)

**Keep in `server` when:**
- ✅ Game logic (combat, movement, AI)
- ✅ Database access
- ✅ OpenAI integration
- ✅ Event propagation implementation

**Keep in `client` when:**
- ✅ React components
- ✅ UI state management
- ✅ Rendering logic (data → text/visual)
- ✅ WebSocket client

**Anti-pattern:**
- ❌ Duplicating types across packages
- ❌ Client-specific code in shared
- ❌ Server-specific logic in shared

### Event Flow Architecture

```
Player types command
    ↓
WebSocket → Server
    ↓
Command Parser
    ↓
Game Engine (executes mechanics)
    ↓
Generates GameEvent[]
    ↓
EventPropagator (calculates affected actors via BFS)
    ↓
EventDeliverySystem
    ├→ Players (via socket ID)
    ├→ AI Agents (event queue)
    └→ Admins (admin channel)
    ↓
Clients render events
```

**Key insight:** Event propagation is **game logic**, not transport logic.

### The Actor Model

**Both players and AI agents are "actors":**
- Located in rooms
- Hear events based on distance
- Can execute commands
- Tracked by ActorRegistry

**Difference:**
- Players have sockets (receive events via WebSocket)
- AI agents have event queues (process events with cooldowns)

**Why this matters:**
- AI agents must hear combat to react
- They must hear player speech to respond
- They experience the same world as players
- Unified command system works for both

---

## Critical Implementation Details

### Range-Based Event Propagation

**EVENT_RANGES determines how far events carry:**

```typescript
const EVENT_RANGES = {
  whisper: 0,        // Same room only
  speech: 0,         // Same room only
  combat_hit: 0,     // Same room only
  combat_start: 1,   // Hear in adjacent rooms
  death: 2,          // Scream carries 2 rooms
  shout: 3,          // Carries 3 rooms
};
```

**Implementation:**
1. RoomGraph pre-computes adjacency map
2. BFS finds all rooms within N steps
3. For each room, get all actors
4. Attenuate event based on distance
5. Deliver to each actor

**Performance:** O(V+E) BFS per event ≈ 200 ops for 200 rooms. Handles thousands of events/sec.

### Actor Registry Design

**Tracks every actor in the world:**

```typescript
// In-memory registries
actors: Map<ActorId, ActorLocation>
roomOccupants: Map<RoomId, Set<ActorId>>
socketToActor: Map<socketId, ActorId>
actorToSocket: Map<ActorId, socketId>
```

**Why four maps:**
- Fast lookup by actor ID
- Fast lookup by room ID
- Fast lookup by socket ID
- Bidirectional socket ↔ actor mapping

**Operations are O(1):**
- getActorsInRoom(roomId) → Set<ActorId>
- moveActor(actorId, fromRoom, toRoom) → Update 2 maps
- getSocketId(actorId) → string

### AI Agent Event Processing

**AI agents don't block the game loop:**

```
1. Event generated
2. Queued for AI agent
3. Game continues immediately
4. AI processes async (with cooldowns)
5. AI decides action
6. AI executes command (same system as players)
7. Command generates new events
8. Loop continues
```

**Cooldowns prevent spam:**
- Speak: 30s
- Move: 120s  
- Observe: 60s

**AI receives only significant events** (not every tiny thing).

---

## Common Patterns

### Creating Events

```typescript
import { createEventId } from '@silt/shared';
import { nanoid } from 'nanoid';

const event: GameEvent = {
  id: createEventId(`event-${nanoid(10)}`),
  type: 'combat',
  timestamp: Date.now(),
  originRoomId: player.currentRoomId,
  content: 'Combat description',
  relatedEntities: [],
  visibility: 'room',
};

await eventSystem.broadcast(event);
```

### Moving Actors

```typescript
// Update game state
player.currentRoomId = newRoomId;

// Update registry
actorRegistry.moveActor(player.id, oldRoomId, newRoomId);

// Generate events
await eventSystem.broadcast({
  type: 'player_left',
  originRoomId: oldRoomId,
  ...
});

await eventSystem.broadcast({
  type: 'player_entered',
  originRoomId: newRoomId,
  ...
});
```

### Type Narrowing (Not Casting)

```typescript
// ✅ GOOD
function getRoom(id: unknown): Room {
  if (typeof id !== 'string') {
    throw new Error('Room ID must be string');
  }
  
  const room = world.getRoom(createRoomId(id));
  if (!room) {
    throw new Error('Room not found');
  }
  
  return room;
}

// ❌ BAD
function getRoom(id: any): Room {
  return world.getRoom(id as RoomId)!;  // Multiple violations!
}
```

---

## Anti-Patterns (Never Do This)

### ❌ Broadcasting to All Clients
```typescript
// WRONG
io.emit('event', data);  // Sends to EVERYONE

// RIGHT
eventSystem.broadcast(event);  // Targets affected actors
```

### ❌ Client-Side Game Logic
```typescript
// WRONG - Client decides combat outcome
const damage = calculateDamageOnClient(attacker, defender);
socket.emit('attack-result', { damage });

// RIGHT - Server decides, client renders
socket.emit('game:command', { command: 'attack goblin' });
// Server calculates, sends event
// Client renders event as text
```

### ❌ Bypassing Event System
```typescript
// WRONG
socket.to(socketId).emit('message', 'You moved north');

// RIGHT
eventSystem.broadcast({
  type: 'movement',
  ...
});
```

### ❌ Large Commits
```typescript
// WRONG
git commit -m "Add entire combat system"
// 800 lines changed

// RIGHT
git commit -m "feat(combat): add damage calculation"
// 45 lines: damage-calculator.ts + tests

git commit -m "feat(combat): add attack command"
// 60 lines: attack command + tests

git commit -m "feat(combat): integrate with event system"
// 40 lines: wire combat into events
```

---

## Testing Strategy

### What to Test

**Always test:**
- Pure functions (100% coverage)
- Business logic (combat, movement, inventory)
- Command parsing
- Event generation
- Error cases

**Don't test:**
- TypeScript types (compiler checks this)
- Third-party libraries
- Simple getters/setters
- Configuration

### Test Structure

```typescript
// Co-located: world.ts → world.test.ts

import { describe, it, expect } from 'vitest';
import { World } from './world.js';

describe('World', () => {
  it('should return starting room', () => {
    const world = new World();
    const roomId = world.getStartingRoomId();
    const room = world.getRoom(roomId);
    
    expect(room).toBeDefined();
    expect(room?.name).toBe('Town Square');
  });
  
  it('should resolve valid exits', () => {
    const world = new World();
    const townId = world.getStartingRoomId();
    const targetId = world.getRoomExit(townId, 'north');
    
    expect(targetId).toBeDefined();
  });
  
  it('should return undefined for invalid exits', () => {
    const world = new World();
    const townId = world.getStartingRoomId();
    const result = world.getRoomExit(townId, 'invalid');
    
    expect(result).toBeUndefined();
  });
});
```

---

## Commit Workflow

### Small, Atomic Commits

**Goal: 50-100 lines per commit**

**Strategy:**
1. Implement function
2. Write tests
3. Commit (function + tests)
4. Repeat

**Example feature: Add movement system**
```bash
# Commit 1 (65 lines)
git add packages/server/src/game/movement.ts
git add packages/server/src/game/movement.test.ts
git commit -m "feat(movement): add room exit resolution"

# Commit 2 (45 lines)
git add packages/server/src/game/commands.ts
git add packages/server/src/game/commands.test.ts
git commit -m "feat(commands): add go command"

# Commit 3 (55 lines)
git add packages/server/src/game/engine.ts
git commit -m "feat(engine): integrate movement with event system"
```

### When to Commit

- ✅ After completing a function + tests
- ✅ After refactoring a module
- ✅ Before switching contexts
- ✅ At end of work session
- ✅ When tests pass

**Frequency:** 3-5 commits per hour of coding.

---

## Decision Rationale

### Why Actor-Based Event Propagation?

**Requirement:** Events must propagate based on distance in room graph.

**Alternative 1: Socket.io rooms per game room**
- Problem: Can't hear events from adjacent rooms
- Requires complex channel management for ranges
- Doesn't work for AI agents (no sockets)

**Alternative 2: Broadcast to all, filter on client**
- Problem: Doesn't scale (1000 players = 1000 messages per action)
- Wastes bandwidth
- Client can't be trusted to filter correctly

**Chosen: Actor-based targeting**
- ✅ BFS finds affected rooms
- ✅ Direct socket sends to affected players
- ✅ Event queues for AI agents
- ✅ Scales to thousands of actors
- ✅ Works for players and AI equally

### Why No Build Step?

**Requirement:** Fast iteration, simple workflow.

**Alternative: Build shared package**
- Requires `tsc --watch` or build scripts
- Two-step process (edit → build → see changes)
- Build errors are confusing
- Slows development

**Chosen: TypeScript path mappings**
- ✅ Instant type checking
- ✅ No build step
- ✅ Simple mental model
- ✅ Fast hot reload

### Why Monorepo?

**Requirement:** Share types between client and server.

**Alternative: Separate repos**
- Types drift between repos
- Breaking changes require coordinated deploys
- Hard to make atomic changes

**Chosen: npm workspaces monorepo**
- ✅ Shared types always in sync
- ✅ Atomic commits across client and server
- ✅ Single source of truth
- ✅ Simpler deployment

---

## File Organization

### When to Extract to Shared

**Extract when:**
- Both client and server import it
- It's a type definition
- It's a constant used in both places
- It's a pure utility function

**Don't extract when:**
- Only server uses it
- Only client uses it
- It has side effects
- It depends on server/client-only packages

### Module Size Strategy

**At 250 lines:** Start planning refactor
**At 300 lines:** STOP and split immediately

**How to split:**
```
// Before: combat-system.ts (400 lines)
❌ Too large

// After:
✅ combat-system.ts (main orchestration, 180 lines)
✅ damage-calculator.ts (pure calculation, 60 lines)
✅ combat-validator.ts (validation logic, 80 lines)
✅ combat-events.ts (event generation, 80 lines)
```

---

## Development Workflow

### Initial Setup

```bash
git clone git@github.com:elliotbonneville/silt.git
cd silt
npm install
cp env.example .env
```

### Running Dev Servers

```bash
# Both servers (recommended)
npm run dev

# Or individually
npm run dev:server  # http://localhost:3000
npm run dev:client  # http://localhost:5173
```

### Before Every Commit

```bash
# Run full validation
npm run check-all

# What it checks:
# ✅ Biome linting
# ✅ TypeScript compilation
# ✅ All tests pass
# ✅ Files under 300 lines
# ✅ No unused exports
```

**Pre-commit hook runs this automatically.**

### Adding a New Feature

1. **Plan the module structure** (keep files under 300 lines)
2. **Write types in shared** (if client needs them)
3. **Implement server logic** (small files, single responsibility)
4. **Write tests** (co-located with implementation)
5. **Commit** (50-100 lines: implementation + tests)
6. **Repeat** until feature complete

### Creating Tests

```bash
# Co-locate tests with implementation
packages/server/src/game/combat-system.ts
packages/server/src/game/combat-system.test.ts

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

---

## Key Abstractions

### RoomGraph
- BFS distance calculation
- Finds rooms within N steps
- Rebuilt when admins add/remove rooms
- Core of range-based propagation

### ActorRegistry
- Tracks all actors (players + AI)
- Maps actors to rooms
- Maps players to sockets
- O(1) lookups

### EventPropagator
- Calculates affected actors
- Attenuates events by distance
- Pure game logic (no socket knowledge)

### EventDeliverySystem
- Delivers to players (WebSocket)
- Queues for AI agents
- Sends to admins
- Pure transport layer

### EventSystem
- High-level API
- Only interface game code uses
- Orchestrates propagation + delivery + logging

---

## Remember

The event system is **THE FOUNDATION**. Everything else is built on top of it. Get this right in Iteration 0, and the rest follows naturally.

