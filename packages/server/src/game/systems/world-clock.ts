import { EventEmitter } from 'node:events';
import type { GameSystem, TickContext } from './game-loop.js';

export class WorldClock extends EventEmitter implements GameSystem {
  private gameTime = 0; // Total game seconds
  private speedFactor = 20; // 1 real sec = 20 game sec
  private accumulator = 0;
  private isPaused = false;

  // Constants
  private readonly DAY_SECONDS = 86400; // 24 * 60 * 60

  get time() {
    return this.gameTime;
  }

  /**
   * Current seconds into the day (0 - 86399)
   */
  get timeOfDay() {
    return this.gameTime % this.DAY_SECONDS;
  }

  /**
   * Current hour (0-23)
   */
  get hour() {
    return Math.floor(this.timeOfDay / 3600);
  }

  /**
   * Current minute (0-59)
   */
  get minute() {
    return Math.floor((this.timeOfDay % 3600) / 60);
  }

  onTick(context: TickContext) {
    if (this.isPaused) return;

    // Add scaled time
    this.accumulator += context.deltaTime * this.speedFactor;

    // If we've accumulated at least 1 game second, advance the clock
    if (this.accumulator >= 1) {
      const secondsToAdd = Math.floor(this.accumulator);
      const previousMinute = this.minute;
      const previousHour = this.hour;

      this.gameTime += secondsToAdd;
      this.accumulator -= secondsToAdd;

      // Check for time thresholds
      if (this.minute !== previousMinute) {
        this.emit('time:minute', { time: this.gameTime, hour: this.hour, minute: this.minute });
      }

      if (this.hour !== previousHour) {
        this.emit('time:hour', { time: this.gameTime, hour: this.hour });
      }
    }
  }

  setGameTime(seconds: number) {
    this.gameTime = seconds;
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  /**
   * Format time as HH:MM
   */
  get formattedTime(): string {
    const h = this.hour.toString().padStart(2, '0');
    const m = this.minute.toString().padStart(2, '0');
    return `${h}:${m}`;
  }
}
