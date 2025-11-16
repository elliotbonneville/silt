# AI System Improvements - Deep Dive

## Current State (Iteration 3)

We have a working AI system where:
- Town Crier responds to any speech in the room
- 3-second cooldown between responses
- Basic relationship tracking (sentiment, trust, familiarity)
- Last 20 messages stored
- Works with OpenAI or mock mode

## Drawbacks of Current Approach

### 1. **No Targeting - AI Responds to Everything**

**Problem:**
```
Player A: say I love pizza
Town Crier: "I'm glad you enjoy food, traveler!"

Player B: say the goblin is tough
Town Crier: "Indeed, the goblin can be challenging!"
```

The AI responds to ALL speech, even when not being addressed. This feels unnatural.

**Issues:**
- AI interrupts private conversations between players
- AI seems overly eager/chatty
- No way to have a conversation with a specific NPC
- Multiple AI agents would all respond to same message

**Possible Solutions:**

**Option A: Implicit Targeting (Proximity + Context)**
```
say hello                    → Town Crier responds (only NPC in room)
say hello Town Crier         → Town Crier responds (explicit)
say to Town Crier hello      → Town Crier responds (explicit)
```

AI only responds if:
1. Explicitly named in the message
2. Only AI in room (assume they're being addressed)
3. Message is a question/greeting when alone with player
4. Message references something AI said recently (context)

**Option B: Explicit Targeting Only**
```
@Town Crier hello            → Town Crier responds
talk Town Crier hello        → Town Crier responds  
say hello                    → No response (not targeted)
```

Clearer but less immersive.

**Option C: Conversation State Machine**
```
> say hello Town Crier
Town Crier: "Greetings! How may I help?"
[You are now in conversation with Town Crier]

> what's north?
Town Crier: "The forest path leads north..."

> thanks
Town Crier: "Anytime, friend!"
[Conversation ended]
```

Maintains conversation context until explicitly ended.

**Recommendation:** Start with **Option A** (implicit targeting). Most natural, handles edge cases well.

---

### 2. **Fixed Cooldown - No Context Awareness**

**Problem:**
```
Player: say where is the tavern?
Town Crier: "The tavern is east of here."

Player: say thanks!
[3 seconds haven't passed - no response]
```

The 3-second cooldown is blind to conversation flow.

**Issues:**
- Breaks natural conversation rhythm
- Same cooldown for quick acknowledgment vs long answer
- Doesn't consider if player is waiting for response
- Can't have rapid back-and-forth

**Possible Solutions:**

**Option A: Variable Cooldown Based on Response Type**
```typescript
const cooldowns = {
  greeting: 1000,        // Quick responses to hi/bye
  acknowledgment: 500,   // "okay", "thanks", "got it"
  question: 2000,        // Answering questions
  lore: 5000,           // Long storytelling
  proactive: 30000,     // Unsolicited comments
};
```

**Option B: Conversation Mode**
```typescript
// When in active conversation: 500ms cooldown
// When idle: 30s before speaking again
// Conversation ends after 30s of silence
```

**Option C: Token Budget System**
```typescript
// Each AI has 1000 tokens/minute budget
// Short responses (50 tokens) = frequent
// Long responses (150 tokens) = wait longer
// Prevents API cost explosion
```

**Recommendation:** Combine **Option A + B**. Short cooldowns during active conversation, long cooldowns when idle.

---

### 3. **No Situational Awareness**

**Problem:**
```
[Goblin attacks player]
Player: say help!
Town Crier: "Hello! How can I assist you today?" 
```

AI doesn't know combat is happening, someone is dying, or items were dropped.

**Issues:**
- AI misses dramatic moments
- Can't react to combat, death, looting
- Doesn't notice new players entering
- Feels disconnected from world events

**Possible Solutions:**

**Option A: Event Context in Prompt**
```typescript
const roomContext = `
Recent events in this room:
- Goblin attacked Thorin (5 seconds ago)
- Thorin's HP: 45/100
- Sarah entered the room (10 seconds ago)
`;
```

AI prompt includes recent room events.

**Option B: Reactive Events**
```typescript
// AI agents subscribe to event types
townCrier.reactToEvents = ['combat_start', 'death', 'player_entered'];

// On death event
if (event.type === 'death') {
  agent.queueReaction('Someone just died! I should acknowledge this.');
}
```

**Option C: Proactive Observations**
```typescript
// Every 30 seconds, AI "looks around"
const observation = aiAgent.observe(roomState);

// AI might say:
"I see you're injured, Thorin. The tavern has healing potions."
"Welcome to the town square, Sarah!"
```

**Recommendation:** **Option B** (reactive events). Most aligned with our event-driven architecture.

---

### 4. **Memory is Too Simple**

**Problem:**
```typescript
memory.relationships.set(playerName, {
  sentiment: 5,
  trust: 3,
  familiarity: 1,  // Just a counter
  role: 'newcomer'
});
```

This doesn't capture:
- What you talked about
- What you did together
- Promises made
- Information shared

**Issues:**
- AI has goldfish memory beyond 20 messages
- Can't reference past conversations
- Doesn't remember if you helped them
- No long-term story continuity

**Possible Solutions:**

**Option A: Significant Event Tagging**
```typescript
// Tag important moments
{
  type: 'promise',
  player: 'Thorin',
  summary: 'Promised to clear the goblin from forest',
  completed: false,
  timestamp: Date
}

{
  type: 'combat_victory',
  player: 'Thorin', 
  summary: 'Defeated the goblin',
  emotionalWeight: 8,
  timestamp: Date
}
```

**Option B: Semantic Search (Vector DB)**
```typescript
// Store conversation summaries as embeddings
// Query: "What do I know about Thorin?"
// Returns: Top 5 relevant memories

memories = vectorDB.search({
  query: currentConversation,
  filter: { agentId, playerId },
  limit: 5
});
```

**Option C: Structured Facts**
```typescript
knowledge = {
  'Thorin': {
    facts: [
      { fact: 'defeated goblin', confidence: 1.0, source: 'witnessed' },
      { fact: 'seeking ancient treasure', confidence: 0.8, source: 'told me' },
      { fact: 'from the northern lands', confidence: 0.6, source: 'implied' }
    ]
  }
};
```

**Recommendation:** Start with **Option A** (event tagging). Add vector DB later if needed.

---

### 5. **All AI Agents Sound the Same**

**Problem:**
Even with different system prompts, GPT-4 tends toward similar patterns.

**Issues:**
- Town Crier and Bartender might sound identical
- Hard to maintain distinct personalities
- AI "voice" feels generic

**Possible Solutions:**

**Option A: Temperature + Frequency Penalty Tuning**
```typescript
const personalities = {
  formal: { temperature: 0.5, frequency_penalty: 0.3 },
  casual: { temperature: 0.9, frequency_penalty: -0.2 },
  cryptic: { temperature: 0.8, top_p: 0.85 }
};
```

**Option B: Few-Shot Examples in Prompt**
```typescript
systemPrompt = `You are the Town Crier.

Example interactions:
Player: hello
You: Hear ye, hear ye! Welcome to the square!

Player: what's north?
You: The forest path lies northward - though goblins roam there!
`;
```

**Option C: Template Hybrid (70/30 Split)**
```typescript
// 70% of time: Use personality-specific templates
// 30% of time: Use LLM for variety

if (Math.random() < 0.7) {
  return templates.townCrier.greeting[randomIndex];
} else {
  return await openai.generate();
}
```

**Recommendation:** **Option C** (template hybrid). Consistent personality, occasional AI variety, cost-effective.

---

### 6. **No Proactive Behavior**

**Problem:**
AI agents only respond when spoken to. They never:
- Greet players who enter
- Comment on dramatic events
- Initiate conversations
- React to their environment

**Issues:**
- World feels static
- NPCs feel like vending machines
- No ambient life or personality
- Missing storytelling opportunities

**Possible Solutions:**

**Option A: Event-Triggered Reactions**
```typescript
// When player enters room
onPlayerEntered(player) {
  if (agent.hasRelationship(player)) {
    agent.sayAfterDelay(1000, `Welcome back, ${player.name}!`);
  } else if (agent.isGreeter) {
    agent.sayAfterDelay(2000, `Greetings, traveler!`);
  }
}

// When witnessing combat
onCombatNearby(event) {
  if (event.type === 'death') {
    agent.reactWithDelay(3000, 'witnessedDeath');
  }
}
```

**Option B: Idle Behavior Loop**
```typescript
// Every 2-5 minutes when no players talking
if (shouldPerformIdleAction()) {
  const action = pickRandomIdle([
    'emote polishes his bell',
    'say The market closes at sunset!',
    'emote scans the crowd',
  ]);
}
```

**Option C: Goal-Directed Behavior**
```typescript
// AI has goals and takes actions to achieve them
townCrier.goals = [
  { type: 'inform_about_danger', priority: 8, condition: 'goblin_alive' },
  { type: 'welcome_newcomers', priority: 5, condition: 'new_player_in_room' }
];

// AI evaluates goals and acts accordingly
```

**Recommendation:** Start with **Option A** (event-triggered). Simple, deterministic, feels natural.

---

## Proposed Iteration 3.5: AI Enhancements

Let's improve the AI system before moving to Iteration 4. Focus on:

### Phase 1: Better Targeting (1-2 days)
- [ ] Implement implicit targeting (name matching + context)
- [ ] AI only responds when addressed or alone with player
- [ ] Support explicit targeting: "say to <NPC> <message>"
- [ ] Prevent cross-talk between players' conversations

### Phase 2: Context-Aware Cooldowns (1 day)
- [ ] Variable cooldowns based on message type
- [ ] Conversation mode (short cooldowns during active conversation)
- [ ] Idle mode (long cooldowns when unprompted)
- [ ] Track conversation state (active, idle, ended)

### Phase 3: Situational Awareness (1-2 days)
- [ ] Include recent room events in AI context
- [ ] React to combat, death, player entry
- [ ] Proactive greetings when players enter
- [ ] Acknowledge dramatic moments

### Phase 4: Template Hybrid System (1 day)
- [ ] Create personality-specific response templates
- [ ] 70% templates, 30% LLM for variety
- [ ] Faster responses, lower costs
- [ ] More consistent personalities

### Phase 5: Significant Event Detection (2 days)
- [ ] Tag combat victories as significant
- [ ] Tag quest completions (when we add quests)
- [ ] Tag deaths witnessed
- [ ] Store significant events separately from conversation
- [ ] Include significant events in AI prompt

---

## Alternative: Skip to Iteration 5

The PLAN suggests Iteration 5 is "Command Registry & Actor System" where AI agents can take actions (move, examine, attack).

**Trade-off:**
- **Iteration 3.5 (AI improvements):** Better conversations, more natural
- **Iteration 5 (Actor system):** NPCs can DO things, not just talk

Both are valuable. Which would make the game more fun to play?

---

## Recommendation

I suggest we do a **lightweight Iteration 3.5** focusing on:

1. **Better targeting** (30 min) - Most impactful, fixes cross-talk
2. **Event context** (1 hour) - AI sees room events, feels alive
3. **Proactive greetings** (30 min) - AI greets players entering room

This gives us:
- More natural conversations
- Reactive NPCs
- Better immersion

Then we can move to Iteration 5 (actor system) to let NPCs move and act.

**What do you think? Should we improve conversation quality first, or let NPCs take actions?**

