import { EventEmitter } from 'node:events';

export type TickContext = {
  deltaTime: number; // Time in seconds since last tick
  tick: number; // Total ticks since start
};

export interface GameSystem {
  onTick(context: TickContext): Promise<void> | void;
}

export class GameLoop extends EventEmitter {
  private running = false;
  private lastTime = 0;
  private tickCount = 0;
  private systems: GameSystem[] = [];
  private intervalId?: NodeJS.Timeout;

  // Target 10 ticks per second (100ms per tick)
  private readonly TICK_RATE = 10;
  private readonly TICK_INTERVAL_MS = 1000 / this.TICK_RATE;

  addSystem(system: GameSystem) {
    this.systems.push(system);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = Date.now();

    this.intervalId = setInterval(() => {
      this.tick();
    }, this.TICK_INTERVAL_MS);

    console.info(`🔄 Game Loop started (${this.TICK_RATE} ticks/sec)`);
  }

  stop() {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    console.info('🛑 Game Loop stopped');
  }

  private async tick() {
    const now = Date.now();
    const deltaMs = now - this.lastTime;
    const deltaTime = deltaMs / 1000; // Convert to seconds
    this.lastTime = now;
    this.tickCount++;

    const context: TickContext = {
      deltaTime,
      tick: this.tickCount,
    };

    // Execute all systems sequentially
    // (Could be parallelized later if needed, but sequential avoids race conditions)
    for (const system of this.systems) {
      try {
        await system.onTick(context);
      } catch (error) {
        console.error(`Error in system ${system.constructor.name}:`, error);
      }
    }

    this.emit('tick', context);
  }
}
