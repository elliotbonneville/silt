# Time System Architecture

## Overview
The Time System manages the flow of game time relative to real time. It is decoupled from the server tick rate (which handles combat/movement) to allow for variable time scaling (pausing, fast-forwarding).

## Core Components

### 1. WorldClock Service
A singleton service managed by the `GameEngine`.

**Responsibilities:**
- Holds the master `gameTime` (total seconds since world creation).
- Calculates game time progression based on `speedFactor`.
- Emits time-based events to the rest of the system.

```typescript
class WorldClock {
  private gameTime: bigint; // Total seconds
  private speedFactor: number = 20; // 1 real sec = 20 game sec
  
  // Derived properties
  get hour(): number { ... }
  get minute(): number { ... }
  get isDaytime(): boolean { ... }
}
```

### 2. Data Model
Time is persistent. If the server restarts, time resumes from where it left off.

**Prisma Schema Update:**
```prisma
model GameState {
  id        String   @id @default("default")
  isPaused  Boolean  @default(false)
  gameTime  BigInt   @default(0) // Persistent clock
  updatedAt DateTime @updatedAt
}
```

## Event System
The `WorldClock` emits events that other systems subscribe to.

| Event | Frequency | Payload | Usage |
|:---|:---|:---|:---|
| `TIME_MINUTE` | Every game min (3s) | `{ time }` | UI updates (clock) |
| `TIME_HOUR` | Every game hour (3m) | `{ hour }` | NPC schedules, Hunger ticks |
| `TIME_SUNRISE` | Once/day (06:00) | - | Lighting update, Respawn triggers |
| `TIME_SUNSET` | Once/day (18:00) | - | Lighting update, Mob spawns |

## Integration Points

### 1. Client Synchronization
- **On Connect:** Client receives current `gameTime` and `speedFactor`.
- **Client-Side Prediction:** Client runs its own clock to update the UI smoothy between syncs.
- **Sync:** Server sends periodic time correction events (e.g., every 10 real seconds).

### 2. AI Agent Manager
The `AIAgentManager` subscribes to `TIME_HOUR`.
- Iterates through active agents.
- Checks schedules against new time.
- Pushes new high-level goals (e.g., "Go to Shop", "Go to Bed").

### 3. Room Formatting
`RoomFormatter` checks `WorldClock` when generating descriptions.
```typescript
if (room.isOutdoors && worldClock.isNight) {
  description += " The area is shrouded in darkness.";
}
```

## Implementation Phases

### Phase 1: The Clock
- Create `WorldClock` class.
- Add `gameTime` to `GameState` DB.
- Hook into `GameEngine` loop.
- Add Admin commands: `/time set [hour]`, `/time scale [factor]`.

### Phase 2: Visibility (Future)
- Update `Look` command to check light levels.
- Add light source items.

### Phase 3: Schedules (Future)
- Update AI Agents to respect time-of-day.

