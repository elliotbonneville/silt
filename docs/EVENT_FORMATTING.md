# Server-Side Event Formatting - Architecture Plan

## Current Problem

### Events Are Pre-Formatted (Wrong)

```typescript
// In executeSayCommand()
return {
  success: true,
  events: [{
    type: 'speech',
    content: `${ctx.character.name} says: "${message}"`,  // ❌ Third-person baked in
    data: { actorId, actorName, message }
  }]
};
```

**Problems:**
1. Content is third-person (assumes viewer is not the actor)
2. Client re-formats it ("You say" vs "Thorin says")
3. AI sees the same third-person text
4. Duplicated formatting logic (server + client)
5. Inconsistent - some events formatted, some not

### Client Tries to Fix It

```typescript
// GameTerminal.tsx
function formatEventContent(event, isCurrentPlayer) {
  if (isCurrentPlayer && event.type === 'speech') {
    return `You say: "${event.data.message}"`;
  }
  return event.content; // "Thorin says: ..."
}
```

**Problems:**
- Client has game logic (formatting)
- AI doesn't get this formatting
- Code duplication
- Hard to maintain

---

## Correct Architecture

### Principle: Data-Only Events, Format on Delivery

**Events contain ONLY data:**
```typescript
{
  type: 'speech',
  // NO content field at creation
  data: {
    actorId: 'char-123',
    actorName: 'Thorin',
    message: 'hello'
  }
}
```

**Format per-recipient:**
```typescript
// For Thorin (the speaker)
content: `You say: "hello"`

// For other players
content: `Thorin says: "hello"`

// For AI agents
content: `Thorin says: "hello"`  // Same as other players
```

---

## Implementation Plan

### Phase 1: Create Unified Formatter

**File:** `packages/server/src/game/event-content-formatter.ts`

```typescript
/**
 * Format event content based on viewer's perspective
 */
export function formatEventContent(
  event: GameEvent,
  viewerActorId: string
): string {
  const data = event.data || {};
  const actorId = data['actorId'];
  const isYou = actorId === viewerActorId;

  switch (event.type) {
    case 'speech': {
      const speaker = data['actorName'] || 'Someone';
      const message = data['message'] || '';
      return isYou 
        ? `You say: "${message}"`
        : `${speaker} says: "${message}"`;
    }

    case 'movement': {
      const actor = data['actorName'] || 'Someone';
      const direction = data['direction'] || '';
      return isYou
        ? `You move ${direction}.`
        : `${actor} moves ${direction}.`;
    }

    case 'combat_hit': {
      const attacker = data['actorName'] || 'Someone';
      const target = data['targetName'] || 'someone';
      const damage = data['damage'] || 0;
      const targetHp = data['targetHp'] || 0;
      const targetMaxHp = data['targetMaxHp'] || 0;
      
      const isAttacker = data['actorId'] === viewerActorId;
      const isTarget = data['targetId'] === viewerActorId;
      
      if (isAttacker) {
        return `You attack ${target} for ${damage} damage! (${targetHp}/${targetMaxHp} HP)`;
      } else if (isTarget) {
        return `${attacker} attacks you for ${damage} damage! (${targetHp}/${targetMaxHp} HP)`;
      } else {
        return `${attacker} attacks ${target} for ${damage} damage! (${targetHp}/${targetMaxHp} HP)`;
      }
    }

    case 'item_pickup': {
      const actor = data['actorName'] || 'Someone';
      const item = data['itemName'] || 'something';
      return isYou
        ? `You take ${item}.`
        : `${actor} takes ${item}.`;
    }

    case 'item_drop': {
      const actor = data['actorName'] || 'Someone';
      const item = data['itemName'] || 'something';
      return isYou
        ? `You drop ${item}.`
        : `${actor} drops ${item}.`;
    }

    case 'player_entered': {
      const player = data['actorName'] || 'Someone';
      return `${player} has entered the room.`;
    }

    case 'player_left': {
      const player = data['actorName'] || 'Someone';
      return `${player} has left the room.`;
    }

    case 'death': {
      const victim = data['victimName'] || 'Someone';
      const killer = data['killerName'] || 'someone';
      return `💀 ${victim} has been slain by ${killer}!`;
    }

    case 'room_description':
      // Always the same for everyone
      return data['description'] || 'You are somewhere.';

    default:
      return 'Something happened.';
  }
}
```

### Phase 2: Update EventPropagator

```typescript
// In EventPropagator.broadcast()
for (const [actorId, attenuatedEvent] of affectedActors) {
  // Format content for this specific recipient
  const formattedEvent = {
    ...attenuatedEvent,
    content: formatEventContent(attenuatedEvent, actorId)
  };
  
  const actor = this.actorRegistry.getActor(actorId);
  if (actor) {
    actor.handleEvent(formattedEvent);
  }
}
```

### Phase 3: Remove Content from Event Creation

**Before:**
```typescript
// combat-commands.ts
return {
  success: true,
  events: [{
    type: 'combat_hit',
    content: `${attacker.name} attacks ${target.name} for ${damage} damage!`,  // ❌ Remove
    data: { actorId, actorName, targetId, targetName, damage, targetHp, targetMaxHp }
  }]
};
```

**After:**
```typescript
return {
  success: true,
  events: [{
    type: 'combat_hit',
    // NO content field
    data: { actorId, actorName, targetId, targetName, damage, targetHp, targetMaxHp }
  }]
};
```

### Phase 4: Remove Client-Side Formatting

**Delete from GameTerminal.tsx:**
```typescript
// This entire function goes away
function formatEventContent(event, isCurrentPlayer) {
  // ...
}
```

**Client just displays event.content:**
```typescript
<div>{event.content}</div>
```

### Phase 5: Update AI Context

**AI formatting becomes trivial:**
```typescript
// AI already gets formatted content from EventPropagator
const formattedEvents = queuedEvents.map(e => e.content);
```

---

## Benefits

✅ **Single Source of Truth**
- All formatting in one place (server)
- Easy to change message formats

✅ **AI Sees Exactly What Players See**
- No discrepancies
- Better AI decisions

✅ **Simpler Event Creation**
- Commands just provide data
- No string concatenation

✅ **DRY Principle**
- Remove duplicate formatting from client
- Remove duplicate formatting from AI

✅ **Easier i18n Later**
- Format based on actor's language preference
- All in one place

---

## Migration Strategy

### Option A: Big Bang (Risky)
1. Update all commands at once
2. Update EventPropagator
3. Update client
4. Test everything

**Risk:** Lots of things break at once

### Option B: Gradual (Safe)

**Step 1:** Add formatting to EventPropagator (keep existing content)
```typescript
const formattedEvent = {
  ...event,
  content: event.content || formatEventContent(event, actorId)
};
```

**Step 2:** Migrate commands one category at a time
- Social commands first (say, shout, emote)
- Then combat
- Then inventory
- Then movement

**Step 3:** Remove client formatting (once server handles all)

**Step 4:** Clean up old code

**Recommendation: Option B** - Ship working game, migrate gradually

---

## Affected Files

### New Files
- `event-content-formatter.ts` (150 lines) - Unified formatter

### Modified Files
- `event-propagator.ts` - Add formatting before delivery
- `social-commands.ts` - Remove content, data only
- `combat-commands.ts` - Remove content, data only
- `inventory-commands.ts` - Remove content, data only
- `navigation-commands.ts` - Remove content, data only
- `GameTerminal.tsx` - Remove formatEventContent()
- `ai-agent-manager.ts` - Simplified (just use event.content)

### Deleted Code
- Client-side formatEventContent() (~50 lines)
- Content generation in commands (~200 lines total)

**Net Result:** ~100 lines removed, cleaner architecture

---

## Example: Speech Event

### Current (Inconsistent)
```typescript
// Server creates
{
  type: 'speech',
  content: `${character.name} says: "${message}"`,
  data: { actorId, actorName, message }
}

// Client re-formats
if (isCurrentPlayer) {
  return `You say: "${message}"`;
}

// AI uses server content (not client-formatted)
```

### Proposed (Consistent)
```typescript
// Server creates (data only)
{
  type: 'speech',
  data: { actorId, actorName, message }
}

// EventPropagator formats per-recipient
for Thorin: content = `You say: "${message}"`
for Sarah:  content = `Thorin says: "${message}"`
for AI:     content = `Thorin says: "${message}"`

// Client just displays
<div>{event.content}</div>

// AI just uses
formattedEvents = events.map(e => e.content)
```

---

## Impact on Current Code

### Events that need migration
- speech (say, shout)
- emote
- combat_hit
- death  
- movement
- item_pickup
- item_drop
- player_entered
- player_left

### Events that stay the same
- room_description (always same content)
- system messages (always same content)
- ambient (always same content)

---

## Recommendation

**Implement in Iteration 6** (not now)

**Why wait:**
1. Just shipped massive AI system (test first!)
2. Non-breaking change (can add gradually)
3. Current system works (just inconsistent)
4. Need user feedback on AI behavior first

**Why do it eventually:**
1. Critical for AI quality
2. Cleaner codebase
3. Foundation for i18n
4. Easier to maintain

---

## When We Do It

**Time estimate:** 2-3 hours
- 30 min: Create formatter
- 1 hour: Migrate commands
- 30 min: Update EventPropagator  
- 30 min: Remove client formatting
- 30 min: Testing

**Low risk** if done gradually with fallbacks.

---

## Alternative: Minimal Fix for AI (Now)

Instead of full refactoring, just improve AI formatting:

```typescript
// formatEventForAI() - make it smarter
export function formatEventForAI(event: GameEvent): string {
  // Extract actor names from data (not content)
  const actorName = event.data?.['actorName'];
  
  switch (event.type) {
    case 'speech':
      return `${actorName} says: "${event.data.message}"`;
    case 'player_entered':
      return `${actorName} entered the room`;
    // etc...
  }
}
```

**This fixes AI context without touching everything else.**

Which approach do you prefer?
1. **Full refactoring now** (2-3 hours, clean architecture)
2. **Minimal AI fix now** (30 min, AI works better)
3. **Document and do later** (ship what we have, iterate)

