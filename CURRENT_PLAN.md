# Current Plan: Pure Prisma Refactoring

## Context

We've identified a critical architectural issue: **in-memory state vs database desync**.

Example: Character moves in-memory but isn't persisted → server restart resets position.

## Decision: Pure Prisma as Source of Truth

**Make Prisma the single source of truth for ALL game state.**

No in-memory caching of Characters, Items, or Rooms. Query Prisma for every read, write immediately on every change.

### Why This Works for MUDs:

- **Turn-based gameplay** - Not real-time FPS, no 60fps requirements
- **Low action rate** - ~2-5 actions/sec per player
- **PostgreSQL scales** - Handles 10k+ writes/sec easily (we need ~200 at 100 players)
- **Eliminates entire class of bugs** - No sync issues, ever
- **Simpler code** - No cache invalidation logic

## Refactoring Plan

### Phase 1: CharacterManager (STARTED)

**File:** `packages/server/src/game/character-manager.ts`

**Changes:**
- ✅ Remove `activeCharacters` Map
- ✅ Change `getCharacter()` to async (queries Prisma)
- ✅ Change `getCharacterBySocketId()` to async
- ✅ Change `getCharacterInRoom()` to async
- ✅ Change `getCharactersInRoom()` to async
- ⏳ Keep `playerSessions` Map (just socket → characterId mapping)

**Impact:**
- Every call to `getCharacter()` now needs `await`
- Engine, AI, Commands must update

---

### Phase 2: Update Engine

**File:** `packages/server/src/game/engine.ts`

**Changes:**
```typescript
// OLD
const character = this.characterManager.getCharacterBySocketId(socketId);

// NEW  
const character = await this.characterManager.getCharacterBySocketId(socketId);
```

**Methods to update:**
- `handleCommand()` - already async ✅
- `executeAIAction()` - already async ✅
- Anywhere calling `getCharacter()`

---

### Phase 3: Update Commands

**File:** `packages/server/src/game/commands.ts`

**Change CommandContext:**
```typescript
// OLD
getCharacterInRoom: (roomId: string, name: string) => Character | undefined

// NEW
getCharacterInRoom: (roomId: string, name: string) => Promise<Character | null>
```

**Update all commands:**
- `executeAttackCommand()` - add `await` for getCharacterInRoom
- Any command that queries characters

---

### Phase 4: Update AI System

**Files:**
- `packages/server/src/game/ai-agent-manager.ts`
- `packages/server/src/game/engine.ts` (executeAIAction)

**Changes:**
```typescript
// OLD
const character = this.getCharacter(id);

// NEW
const character = await this.getCharacter(id);
```

**AI Manager changes:**
- `processProactiveActions()` - add awaits
- Anywhere accessing character data

---

### Phase 5: Update World

**File:** `packages/server/src/game/world.ts`

**Change player lookup:**
```typescript
// OLD (in-memory)
setPlayerLookupFunction((roomId) => 
  this.actorRegistry.getActorsInRoom(roomId).map(...)
);

// NEW (query Prisma)
async getRoomDescription(roomId: string): Promise<string> {
  const chars = await prisma.character.findMany({
    where: { currentRoomId: roomId, isAlive: true }
  });
  // ...
}
```

---

### Phase 6: Remove In-Memory Updates

**Find and replace pattern:**

```typescript
// FIND (bad pattern)
character.hp = newHp;
await updateCharacter(id, { hp: newHp });

// REPLACE (atomic)
await updateCharacter(id, { hp: newHp });
// Don't modify in-memory object at all
```

**Files to check:**
- `combat-commands.ts` - HP updates
- `inventory-commands.ts` - stat recalculations
- `engine.ts` - position updates
- Any direct property assignments

---

### Phase 7: Optimize Hot Paths

**Add batch queries where needed:**

```typescript
// Instead of N queries in a loop
for (const actorId of actorIds) {
  const char = await getCharacter(actorId); // N queries
}

// Use whereIn
const chars = await prisma.character.findMany({
  where: { id: { in: Array.from(actorIds) } }  // 1 query
});
```

**Hot paths:**
- Event propagation (getting actors in room)
- Room descriptions (characters + items)
- AI decision loop

---

## Expected Benefits

### ✅ Pros:
1. **No sync bugs** - Impossible to have stale data
2. **Simpler code** - No cache invalidation
3. **Crash-proof** - Every change persisted immediately
4. **Easier debugging** - DB = current state always
5. **Event sourcing ready** - Can replay from event log to rebuild state

### ⚠️ Considerations:
1. More DB queries (~10-20x increase)
2. Slightly higher latency (~5-10ms per action vs ~1ms)
3. Need connection pooling for PostgreSQL migration
4. Should add query logging to monitor performance

---

## Migration Strategy

### Step-by-Step (Safe):

1. ✅ **Start with CharacterManager** (done)
2. Update Engine to use async getCharacter
3. Update Commands one-by-one
4. Update AI system
5. Remove all in-memory mutations
6. Add batch queries for performance
7. Test thoroughly
8. Monitor query counts

### Testing Checklist:

- [ ] Character movement persists across restart
- [ ] Combat damage persists
- [ ] Item pickup/drop persists
- [ ] Equipment changes persist
- [ ] Death persists
- [ ] AI agents can query characters
- [ ] Room descriptions show correct occupants
- [ ] No N+1 query issues in hot paths

---

## Performance Targets

**With SQLite:**
- 10 players: ✅ < 100 queries/sec (fine)
- 100 players: ✅ < 1000 queries/sec (fine)
- 500 players: ⚠️ approaching limits

**When to migrate to PostgreSQL:**
- 200+ concurrent players
- Query response time > 50ms
- SQLite write locks becoming bottleneck

**PostgreSQL will handle:**
- 1000+ concurrent players easily
- 10k+ queries/sec
- Proper connection pooling

---

## Current Status

### ✅ Completed Today:
- Unified event formatting
- Event factory system
- Structured command output
- Event persistence to database
- Admin dashboard with live map
- AI events unified
- Movement persistence fix
- CharacterManager refactored (async methods)

### 🚧 Next Session:
- Update Engine to use async CharacterManager
- Update all commands
- Update AI system
- Remove in-memory character mutations
- Test and verify

---

## Files to Modify (Next Session)

### Must Change:
1. `packages/server/src/game/engine.ts` - async getCharacter calls
2. `packages/server/src/game/commands.ts` - async CommandContext
3. `packages/server/src/game/combat-commands.ts` - async getCharacterInRoom
4. `packages/server/src/game/ai-agent-manager.ts` - async character queries
5. `packages/server/src/game/world.ts` - remove player lookup fn, query directly

### Review for Mutations:
6. All command files - check for `character.prop = value`
7. `packages/server/src/game/command-handler.ts` - stat update logic
8. Any file with `updateCharacter` calls

---

## Code Patterns

### ❌ OLD (Memory-first):
```typescript
const character = manager.getCharacter(id);      // sync, in-memory
character.hp -= damage;                           // mutate
await updateCharacter(id, { hp: character.hp }); // persist (sometimes forgotten!)
```

### ✅ NEW (Prisma-first):
```typescript
const character = await manager.getCharacter(id); // async, from DB
await updateCharacter(id, { hp: character.hp - damage }); // atomic update
// No in-memory mutation needed
```

### ✅ BEST (Atomic):
```typescript
await prisma.character.update({
  where: { id },
  data: { hp: { decrement: damage } }  // Atomic decrement
});
```

---

## Notes

- **7 commits ahead** - ready to push after Prisma refactor
- Database seeded with 10-room world
- Admin dashboard fully functional
- This refactoring estimated: 2-3 hours
- Will touch ~15-20 files
- Breaking change but worth it for correctness

---

## Questions to Consider

1. **Do we need read replicas?** Not yet (< 1000 players)
2. **Redis caching?** Only if we hit performance issues
3. **Event sourcing?** We have events, could rebuild state from them
4. **Should Items be Prisma-first too?** YES - same pattern
5. **What about Rooms?** They're static - can cache safely

---

## Reference

See `docs/EVENT_FORMATTING.md` for the formatting architecture we just implemented.

This plan follows the principle: **"Make the right thing easy and the wrong thing hard."**

With Pure Prisma, it's **impossible** to have sync bugs because there's only one state! 🎯

