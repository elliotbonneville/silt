import type { GameSystem, TickContext } from './game-loop.js';

export type QueuedCommand = {
  type: 'player' | 'ai';
  actorId: string; // socketId for player, characterId for AI
  commandText: string;
  originalTimestamp: number;
};

export class CommandQueue implements GameSystem {
  private queue: QueuedCommand[] = [];

  constructor(private readonly processCommand: (cmd: QueuedCommand) => Promise<void>) {}

  enqueue(cmd: QueuedCommand) {
    this.queue.push(cmd);
  }

  async onTick(_context: TickContext) {
    if (this.queue.length === 0) return;

    // Process all queued commands for this tick
    const batch = [...this.queue];
    this.queue = [];

    // console.log(`Processing ${batch.length} commands in tick`);

    for (const cmd of batch) {
      try {
        await this.processCommand(cmd);
      } catch (error) {
        console.error(`Failed to process queued command: ${cmd.commandText}`, error);
      }
    }
  }
}
