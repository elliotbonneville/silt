# Design Philosophy

## Vision

**Silt is a collaborative storytelling engine** powered by AI agents and emergent gameplay mechanics. It's not just another MUD - it's a fundamentally new kind of game that only became possible with modern LLMs.

### What Makes This Different

**Classic MUDs:**
- Pre-written content and quests
- NPCs are menu systems
- Grind for XP and loot
- Text is a limitation

**Silt:**
- **Administrator-driven world** (DMs create the stage)
- **Player-driven narratives** (players create stories through choices)
- **AI-enhanced interactions** (NPCs feel alive, remember, react)
- **Emergent storytelling** (mechanics enable unique moments)
- **Text is the medium** (infinite detail, imagination space)

---

## Core Design Principles

### 1. Collaborative Storytelling, Not Power Fantasy

**Victory condition:** Create memorable narrative moments.

**Not:**
- Reach max level
- Best gear
- Most kills
- Fastest speedrun

**Instead:**
- Stories you tell others
- "Remember when...?" moments
- Relationships with AI NPCs
- Choices that mattered
- Witnessing history

**Design implication:** Every system asks "Does this create story opportunities?"

- Combat → Creates stakes, tension, victory/defeat narratives
- Permadeath → Makes every action meaningful
- AI agents → Create relationships, conflicts, allies
- Event propagation → Witness others' stories
- Range-based hearing → "I heard combat nearby and went to help"

### 2. The 10-Minute Session Loop

**What players do in 10 minutes:**

1. **Explore** → AI generates discoverable moments
2. **Discover** → AI makes discoveries meaningful  
3. **Combat/Encounter** → AI creates stakes and narrative
4. **Share** → AI facilitates storytelling

**Example session:**
```
> go north
[Discover: AI-generated clues about Sarah's tracks]

> follow tracks
[Encounter: Find Sarah wounded, AI creates situation]

> help sarah
[Mechani

cs: Use healing item]
[AI: Sarah becomes grateful ally]

> return to town, tell town crier
[Share: Your story becomes world content]
[Next player hears about it from Town Crier]
```

**Key insight:** Your 10-minute session creates content for the next player's session.

**Design implication:**
- No grinding required
- Always something to discover
- Frequent mechanical interactions
- Social sharing is rewarded
- Short sessions are viable

### 3. Mechanical Depth Enables Narrative Emergence

**Like D&D:** Rules enable story, they don't constrain it.

**The game has:**
- Combat mechanics (HP, damage, cooldowns)
- Inventory system (equipment, stats)
- Permadeath (permanent consequences)
- Room navigation (spatial relationships)
- Event propagation (who hears what)

**These mechanics are NOT arbitrary rules.** They create:
- **Stakes:** Combat can kill you (permanently)
- **Choices:** Fight, flee, negotiate, get help
- **Consequences:** Death matters, actions have weight
- **Emergence:** Unexpected situations from mechanic interactions
- **Witness:** Others hear your combat, come to help/watch

**Anti-pattern:** "Loose-form story" with no mechanics = No tension, no stakes, no emergence.

### 4. Permadeath Creates Meaning

**Accounts have multiple characters. Characters die permanently.**

**Why this is critical:**
- **Real stakes:** Combat isn't trivial
- **Cautious play:** Players think before acting
- **Emotional weight:** Losing a 10-hour character hurts
- **Better stories:** "I barely survived" > "I respawned"
- **Memory:** Dead characters are remembered by AI agents
- **Legacy:** World changed by characters who no longer exist

**Design implications:**
- Characters must be quick to create (minutes, not hours)
- Early characters will die (and that's okay)
- AI agents remember and mourn the dead
- Death creates content for others
- Graveyards, memorials, legends

**Not punitive, narrative:**
- Death is a story beat, not failure
- Each character is a chapter
- Your account is the book

---

## AI Integration Strategy

### AI Enhances, Doesn't Direct

**Administrators = Dungeon Masters**
- Create rooms, NPCs, quests, items
- Write NPC personalities and backstories
- Design encounters and challenges
- Set world rules
- **Control the narrative**

**Players = Protagonists**
- Make choices
- Take actions
- Drive the actual story
- Interact with world and AI NPCs
- **Create emergent narratives**

**AI = Supporting Cast**
- Play the NPCs administrators created
- Remember interactions
- Respond in character
- Witness and react to player actions
- **Serve the administrator's vision**

**AI does NOT:**
- Generate quests (administrator creates them)
- Spawn encounters (administrator designs them)
- Create content (administrator writes it)
- Direct narrative (players drive it)
- Manage difficulty (mechanics handle it)

### The 3-Tier Memory System

**Problem:** AI agents interact with hundreds of players. Can't store full conversation history.

**Solution: Tiered memory**

**Tier 1: Relationship Graph (Always Loaded)**
```typescript
{
  thorin: {
    sentiment: 7,      // -10 to +10
    trust: 6,
    familiarity: 3,
    role: "helpful_adventurer"
  }
}
```
- Lightweight, fast
- Shapes personality toward this player
- No token cost

**Tier 2: Significant Events Only (Vector DB, Iteration 9)**
```typescript
{
  event: "thorin_warned_about_goblins",
  summary: "Thorin warned town about goblin army",
  emotional_weight: 8
}
```
- Only store outcomes, not conversations
- Semantic search finds relevant memories
- Combat, deaths, quests, betrayals, gifts
- NOT casual greetings or repeated questions

**Tier 3: Recent Context Window (Last 10 Messages)**
```typescript
[
  { player: "thorin", said: "I found goblins" },
  { agent: "town_crier", said: "How many?" },
  { player: "thorin", said: "At least a dozen" }
]
```
- For active conversation only
- Flushes when player leaves room
- Immediate context

**Why this works:**
- Scalable (constant memory per player)
- Personal (remembers important things)
- Cost-effective (minimal tokens)
- Feels natural (NPCs "remember" you)

### Signal vs Noise: Mechanics First, Narrative Second

**Problem:** LLMs can ramble. Players want gameplay, not chat simulator.

**Solution: Strict separation**

**Mechanics Decide (Game Engine):**
- Hit or miss
- Damage values
- HP changes
- Death
- Loot drops

**LLM Describes (Narrative Layer):**
- How it looked
- What enemy said
- Personality and emotion

**Example:**
```
[Mechanics - Instant, Accurate]
═══════════════════════════════════
⚔️ You hit Goblin for 12 damage
   Goblin: 8/20 HP
═══════════════════════════════════

[Narrative - Optional, Flavor]
Your sword slices across the goblin's chest.
It staggers backward, snarling.

> _
```

**Players can disable narrative layer if they want pure mechanics.**

**Template + LLM Hybrid (70/30):**
- 70% of time: Use templates (fast, cheap, predictable)
- 30% of time: Generate with LLM (variety, personality)

**Constrained Output:**
- Max 100-150 tokens per response
- JSON schema enforced
- One sentence combat narration
- No rambling monologues

**Every AI interaction must:**
- ✅ Advance game state
- ✅ Provide actionable information
- ✅ Offer choices with consequences
- ✅ Trigger mechanical systems
- ❌ NO chat for chat's sake

### Information Density Over Purple Prose

**Default: Dense, actionable information**
```
Town Square. Fountain in center.
Exits: north, east, west
Occupants: Town Crier, Sarah
Items: wooden sword
```

**Opt-in: Rich LLM descriptions**
```
> examine fountain

You stand before an ancient stone fountain. Water 
flows from a carved lion's mouth, creating gentle 
ripples in the basin. Moss grows between the stones, 
and you notice fresh scratches on the rim - someone 
sharpened a blade here recently.
```

**Players choose their preference:**
- Fast mode: information-dense
- Immersive mode: LLM-enhanced descriptions
- Both available, default to fast

---

## The Event System Philosophy

### Events Are The Foundation

**Everything flows through events.** This is non-negotiable.

**Why:**
1. **AI agents hear and react** - Combat nearby triggers investigation
2. **Range-based propagation** - Hear death screams from 2 rooms away
3. **Admin monitoring** - See everything happening in the world
4. **Audit trail** - Complete history for debugging and replay
5. **Client-agnostic** - Same events render as text or visual map

**The event system enables:**
- Emergent AI behavior (agents react to world state)
- Atmospheric gameplay (hear distant combat)
- Social awareness (know others are active)
- Complete logging (every action tracked)
- Future features (replay, analytics, mobile clients)

**Without events, we can't have:**
- AI agents that respond to combat
- Hearing shouts from distant rooms
- Admin visual map with live updates
- Complete game history
- Multiple client types

### Range-Based Propagation Creates Atmosphere

**Different events carry different distances:**

```typescript
whisper: 0       // Same room only
speech: 0        // Same room only
combat_hit: 0    // Details only in room
combat_start: 1  // "You hear combat nearby"
death: 2         // "A scream echoes from the north"
shout: 3         // Calls for help carry far
explosion: 5     // Major events propagate widely
```

**This creates:**
- **Spatial awareness** - You know something's happening nearby
- **Tension** - Distant screams create dread
- **Coordination** - Shout for help, allies hear
- **Immersion** - World feels lived-in
- **Scale** - Efficient (only send to affected actors)

**Example:**
```
You're in the Tavern.

> look

Tavern. A cozy fireplace warms the room.
Occupants: Bartender
Exits: west

[Event propagates from Town Square (1 room west)]
You hear sounds of combat to the west.

> go west

Town Square.
Thorin is fighting a goblin!

> shout Help needed in town square!

[Event propagates 3 rooms in all directions]
[Players in Tavern, Forest, Training all hear it]
[Some come to help, creating emergent cooperation]
```

---

## What Makes This Only Possible Now

### Without LLMs, You Cannot Have:

✅ **NPCs with memory** - Remember 100 players individually
✅ **Contextual descriptions** - Room described differently based on state
✅ **Natural dialogue** - Responses that feel human
✅ **Emergent reactions** - AI decides how NPC responds to situation
✅ **Dynamic narration** - Combat described differently each time
✅ **Lore generation** - Every item can have unique backstory
✅ **Adaptive personalities** - NPCs change based on interactions

**This game could ONLY exist in 2024+.**

### The Innovation

**Classic MUD + Modern AI = Something New**

**Not just "smarter NPCs."** AI is woven into:
- How the world is described (contextual, state-aware)
- How NPCs remember and evolve (relationship graphs)
- How events are narrated (mechanics + flavor)
- How discoveries connect (generated clues, meaningful finds)

**The text medium + AI = Infinite detail at zero asset cost.**

---

## Stakeholder Roles

### Administrator (DM Role)

**Creates:**
- World map (rooms, connections)
- NPCs (personalities, backstories, behaviors)
- Items (weapons, treasures, consumables)
- Quests (objectives, rewards)
- Rules and mechanics

**Tools:**
- Visual world map editor
- NPC creator (personality, knowledge, triggers)
- Item editor
- Event log viewer
- Live monitoring

**Goal:** Create a compelling stage for player stories.

### Player (Protagonist Role)

**Drives:**
- Narrative through choices
- Exploration and discovery
- Combat and risk-taking
- Social interactions
- World building (Phase II)

**Experience:**
- Text-based interface
- Real-time multiplayer
- AI NPCs that remember them
- Permanent consequences
- Emergent stories

**Goal:** Create memorable moments, form relationships, survive.

### AI Agent (Supporting Cast Role)

**Serves:**
- Administrator's vision (plays character as designed)
- Player experience (reacts naturally, remembers)
- World atmosphere (brings NPCs to life)

**Capabilities:**
- Hear events (combat, speech, movement)
- Remember significant interactions
- Execute same commands as players
- Proactive behavior (with cooldowns)
- Personality and backstory

**Constraints:**
- Can only do what administrator configured
- Respects cooldowns and game mechanics
- Cannot generate quests or spawn content
- Serves, doesn't direct

---

## The Flywheel Effect

### Your Stories Become My Content

**Session 1 - Player A:**
```
Explore north → Discover goblin tracks → 
Combat with goblin → Return to town → 
Tell Town Crier about threat
```

**AI Integration:**
- Town Crier remembers what Player A said
- Updates relationship: Player A is helpful
- Stores significant event: "goblin threat reported"

**Session 2 - Player B (30 minutes later):**
```
> talk to town crier

Town Crier: "Thorin just warned me about goblins 
in the north. If you're heading that way, be careful."

[Player B explores north with context]
[Finds Player A's evidence]
[Builds on Player A's discovery]
```

**Player A's actions created content for Player B.**

**Session 3 - Player A returns:**
```
> talk to bartender

Bartender: "I heard you and Sarah cleared out those 
goblins. The whole town's talking about it."

[World has changed based on Player A + Player B's actions]
```

**The loop:**
- Play → Create content → Others experience it → They create content → You experience it
- AI agents propagate information
- World accumulates history
- Stories build on stories

---

## Permadeath as Design Foundation

### Why Character Death is Permanent

**Problem with traditional MMOs:** Death is trivial. No stakes. No tension.

**Permadeath creates:**

**1. Real Stakes**
- Combat is scary
- Decisions matter
- Risk feels real
- Victory is meaningful

**2. Better Stories**
```
"I barely escaped with 5 HP" 
> 
"I died and respawned"
```

**3. Emotional Investment**
- 10 hours with a character creates attachment
- Loss feels real
- Creates drive for revenge/justice
- Memorable moments

**4. World Memory**
```
> look at grave marker

"Here lies Eldric the Wise, who fell to the 
Goblin Chief in the Dark Cave. He warned the 
town before his final journey."

[AI agents still reference Eldric]
[His actions shaped the world]
[He's part of the history]
```

**5. Account-Level Progression**
- Reputation persists across characters
- Relationships continue
- Knowledge accumulates
- Meta-progression without trivializing individual characters

### Account vs Character Separation

**Account:**
- Persistent identity
- Reputation and relationships
- Multiple characters (alive and dead)
- Meta-progression (future: unlocks, achievements)

**Character:**
- Temporary vessel
- Can die permanently
- Stats and inventory lost on death
- Story ends with death

**Design implication:**
- Quick character creation (5 minutes max)
- Early deaths are expected and okay
- Each character is a new story
- Accounts accumulate history

---

## AI Memory Architecture

### The Three Tiers

**Tier 1: Relationship Graph (Lightweight)**

```typescript
TownCrier.relationships.get("thorin") = {
  sentiment: 7,       // How does NPC feel about player?
  trust: 6,          // How much does NPC trust player?
  familiarity: 3,    // How many interactions?
  role: "hero"       // AI-assigned archetype
}
```

**Cost:** Almost zero (simple object in memory)
**Use:** Every interaction loads this
**Purpose:** Shape personality toward this player

**Tier 2: Significant Events (Vector DB, Phase II)**

```typescript
{
  event: "thorin_defeated_goblin_chief",
  timestamp: Date,
  summary: "Thorin defeated the goblin chief, saving the town",
  mechanical_impact: "goblin_threat_reduced",
  emotional_weight: 9  // Very important
}
```

**Cost:** Storage + vector search
**Use:** Semantic search finds top 3-5 relevant memories
**Purpose:** Remember important things player did

**What counts as significant:**
- ✅ Combat victories/defeats
- ✅ Quests completed
- ✅ Betrayals or alliances
- ✅ Gifts given/received
- ✅ Deaths witnessed
- ❌ "Hi, how are you?"
- ❌ Repeated questions
- ❌ Mundane chat

**Tier 3: Recent Context (Short-term)**

```typescript
[
  { player: "thorin", said: "I found goblin tracks" },
  { agent: "town_crier", said: "Where?" },
  { player: "thorin", said: "In the forest path" }
]
```

**Cost:** Minimal (10 messages)
**Use:** Current conversation only
**Purpose:** Coherent dialogue flow

**Flushes when player leaves room.**

### Why This Architecture Scales

**For 100 players:**
- Tier 1: 100 relationship objects (tiny)
- Tier 2: ~500 significant events total (manageable)
- Tier 3: 10 messages per active conversation (negligible)

**Memory per NPC:** ~50KB for 100 players
**API cost:** Only significant events generate embeddings
**Performance:** Fast lookups, no bottlenecks

---

## Signal vs Noise Strategy

### The Problem

**LLMs can generate endless text. Players want gameplay.**

**Balance needed:**
- Rich enough to feel alive
- Concise enough to not overwhelm
- Meaningful enough to advance gameplay
- Fast enough to not slow action

### The Solution

**1. Mechanics Determine Outcomes**

```typescript
// WRONG: LLM decides combat
> attack goblin
[LLM: "The goblin dodges and you miss"]
// LLM just controlled game mechanics - BAD

// RIGHT: Engine decides, LLM narrates
> attack goblin
[Engine: hit=true, damage=12, goblinHP=8/20]
[LLM: "Your sword cuts deep. The goblin snarls."]
// LLM only adds flavor - GOOD
```

**2. Separate Mechanical and Narrative Layers**

**Mechanical layer (always shown):**
- HP bars
- Damage numbers
- Item stats
- Exits and occupants
- Never LLM-generated
- Always accurate and instant

**Narrative layer (enhancement):**
- Combat descriptions
- NPC dialogue
- Environmental flavor
- Can be slow (API latency)
- Can be disabled by player

**3. Template + LLM Hybrid**

```typescript
70% templates:  "You strike {target} for {damage} damage!"
30% LLM:        "Your blade finds a gap in the goblin's guard..."
```

**Benefits:**
- Fast and cheap most of the time
- LLM adds occasional variety
- Always coherent and brief
- Predictable performance

**4. Constrained LLM Output**

```typescript
interface CombatNarration {
  narration: string;     // Max 100 characters
  enemyQuip?: string;    // Optional, max 50 characters
}
```

**Prompt engineering:**
- Strict character limits
- JSON schema required
- One sentence only
- Focus on action, not exposition

**5. Information Density First**

```
Dense (default):
"Town Square. Exits: N, E, W. Sarah (player). Wooden sword."

Verbose (opt-in via 'examine'):
"You stand in a bustling town square. Sunlight warms 
the cobblestones. A fountain bubbles in the center..."
```

**Default to information. Prose is opt-in.**

### AI Agent Action Budgets

**Prevent spam:**

```typescript
speak: 30s cooldown
move: 120s cooldown
observe: 60s cooldown
combat: 2s cooldown (same as players)
```

**AI agents act deliberately:**
- Not constantly chattering
- Meaningful interactions only
- Respectful of player attention
- Creates anticipation ("What will they say?")

---

## Emergence Over Scripting

### Systems, Not Content

**Traditional MMO approach:**
- Write 1000 quests
- Pre-script all NPC dialogue
- Fixed encounters
- Content = work hours

**Silt approach:**
- Create robust systems
- Let AI fill in details
- Emergent situations from mechanics
- Content = player interactions + AI reactions

**Example:**

**Administrator creates:**
- Goblin NPC (aggressive personality, guards cave)
- Combat mechanics
- Death consequences
- Town Crier NPC (helpful, remembers interactions)

**Emergence happens:**
- Player A attacks goblin, dies
- Player B talks to Town Crier, learns about Player A's death
- Player B + Player C team up
- Defeat goblin together
- Town Crier celebrates their victory
- Goblin stays dead (or administrator respawns with vengeance personality)

**No quest was written. Story emerged from systems.**

### Player Actions as Content

**Every player action can become content:**

**Leave evidence:**
```
> carve warning into tree

[Creates discoverable content]
[Next player finds it]
[AI NPC can reference it]
```

**Share information:**
```
> tell bartender about goblin army

[Bartender remembers]
[Tells other players]
[Information propagates through AI network]
```

**Change world state:**
```
> defeat goblin chief

[World state updates]
[AI agents react]
[Other players see consequences]
[History accumulates]
```

---

## Witness and Memory

### Everything Matters Because It's Remembered

**By AI agents:**
- Town Crier remembers you warned about goblins
- Bartender remembers you're brave
- Goblin remembers you killed its kin

**By event log:**
- Complete history of all actions
- Queryable by room, player, event type
- Admins can review
- Future: players can search their history

**By other players:**
- See your actions in real-time
- Hear about your exploits from NPCs
- Find evidence you left behind
- Build on your discoveries

**Design implication:**
- No action is wasted
- Everything contributes to world state
- Stories accumulate over time
- Reputation is real and persistent

---

## Text as Strength, Not Limitation

### Why Text is Our Chosen Medium

**Not "we can't afford graphics."**
**Not "retro nostalgia."**

**Text provides:**

**1. Infinite Detail at Zero Cost**
- Describe anything imaginable
- AI generates unique descriptions
- No asset creation bottleneck
- Limitless creativity

**2. Imagination Space**
- Players co-create experience
- More personal than graphics
- Scary things are scarier
- Beautiful things more beautiful

**3. Speed**
- Reading is faster than watching animations
- Rapid gameplay possible
- High information density
- No loading screens

**4. Accessibility**
- Screen readers
- Low bandwidth
- Translations
- Customizable presentation

**5. Modifiability**
- AI can generate anything
- Easy to edit and iterate
- No asset pipeline
- Content creation is text editing

**6. Depth**
- Books > movies for narrative depth
- Rich internal monologue
- Detailed world-building
- Nuanced interactions

**We don't apologize for being text-based. Text is our superpower.**

---

## Remember

**This is not a MUD clone. This is something new.**

The combination of:
- Mechanical depth (D&D-style rules)
- AI agents (memory, personality, emergence)
- Permadeath (real stakes)
- Event propagation (atmospheric, social)
- Range-based hearing (spatial awareness)
- Administrator-driven world (curated content)
- Player-driven narrative (emergent stories)
- Text medium (infinite detail)

**...creates an experience that didn't exist before.**

**Our job: Build the systems that enable this magic.**

