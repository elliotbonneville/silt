/**
 * Game engine - integrates all game systems
 * Manages world state, actors, and event propagation
 */

import type { Character } from '@prisma/client';
import type { CharacterListItem, RoomState } from '@silt/shared';
import type { Server } from 'socket.io';
import { findCharacterById, updateCharacter } from '../database/character-repository.js';
import { getGameState, updateGameState } from '../database/game-state-repository.js';
import { createPlayerLog } from '../database/player-log-repository.js';
import { setupAdminHandlers } from './admin-handler.js';
import { AIService } from './ai/index.js';
import { AIAgentManager } from './ai-agent-manager.js';
import { aiDebugLogger } from './ai-debug-logger.js';
import { CharacterManager } from './character-manager.js';
import { CommandHandler } from './command-handler.js';
import { type CommandContext, parseAndExecuteCommand } from './commands.js';
import { ConnectionHandler } from './connection-handler.js';
import { EventPropagator } from './event-propagator.js';
import { CommandQueue, type QueuedCommand } from './systems/command-queue.js';
import { GameLoop } from './systems/game-loop.js';
import { WorldClock } from './systems/world-clock.js';

export class GameEngine {
  readonly characterManager: CharacterManager;
  private readonly aiAgentManager: AIAgentManager;
  private eventPropagator!: EventPropagator;
  private commandHandler!: CommandHandler;
  private connectionHandler!: ConnectionHandler;
  private readonly gameLoop: GameLoop;
  private readonly worldClock: WorldClock;
  private readonly commandQueue: CommandQueue;
  private initialized = false;
  private paused = false;

  constructor(private readonly io: Server) {
    this.characterManager = new CharacterManager(this.io);
    this.gameLoop = new GameLoop();
    this.worldClock = new WorldClock();
    this.commandQueue = new CommandQueue(this.processQueuedCommand.bind(this));

    // Initialize AI service
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    const aiService = new AIService(apiKey);
    this.aiAgentManager = new AIAgentManager(
      aiService,
      async (id: string) => await findCharacterById(id),
      async (_agent, character, action) => {
        // Enqueue AI actions instead of executing immediately
        const commandText = this.aiAgentManager.buildCommandFromAction(action);
        this.commandQueue.enqueue({
          type: 'ai',
          actorId: character.id,
          commandText,
          originalTimestamp: Date.now(),
        });
      },
    );

    // Register game systems
    this.gameLoop.addSystem(this.worldClock);
    this.gameLoop.addSystem(this.commandQueue);
    this.gameLoop.addSystem(this.aiAgentManager);

    console.info('🤖 AI Service: OpenAI API ready');
  }

  /**
   * Initialize the game engine - load world from database
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load game state (pause status, etc.)
    const gameState = await getGameState();
    this.paused = gameState.isPaused;
    if (gameState.gameTime) {
      this.worldClock.setGameTime(Number(gameState.gameTime));
    }

    if (this.paused) {
      console.info('⏸️  Game engine starting in PAUSED state');
      this.worldClock.pause();
    }

    // Load AI agents
    const aiAgents = await this.aiAgentManager.loadAgents();
    console.info(`✅ Loaded ${aiAgents.length} AI agents`);

    // Initialize event propagator
    this.eventPropagator = new EventPropagator(this.characterManager, this.aiAgentManager, this.io);
    this.gameLoop.addSystem(this.eventPropagator);

    // Initialize command handler
    this.commandHandler = new CommandHandler(this.characterManager, this.eventPropagator);

    this.connectionHandler = new ConnectionHandler(
      this.io,
      this.characterManager,
      this.eventPropagator,
    );

    // Set up AI debug logger to broadcast through event system
    aiDebugLogger.setEventPropagator(this.eventPropagator);

    // Set up admin socket handlers
    setupAdminHandlers(this.io);

    if (!this.paused) {
      this.aiAgentManager.startProactiveLoop();
    }

    // Start game loop (always runs to process commands, even if simulation is paused)
    this.gameLoop.start();

    // Initialize spatial memory in background (don't block startup)
    this.aiAgentManager
      .initializeSpatialMemory()
      .catch((error) => console.error('Failed to initialize spatial memory:', error));

    this.initialized = true;
  }

  /**
   * Get characters for a username
   */
  async getCharactersForUsername(username: string): Promise<CharacterListItem[]> {
    return this.characterManager.getCharactersForUsername(username);
  }

  /**
   * Create a new character for a username
   */
  async createNewCharacter(username: string, name: string): Promise<Character> {
    if (!this.initialized) throw new Error('Game engine not initialized');
    return this.characterManager.createNewCharacter(username, name);
  }

  /**
   * Connect a player to a character
   */
  async connectPlayerToCharacter(socketId: string, characterId: string): Promise<Character> {
    if (!this.initialized) throw new Error('Game engine not initialized');
    return this.connectionHandler.connectPlayer(socketId, characterId);
  }

  /**
   * Disconnect a player
   */
  async disconnectPlayer(socketId: string): Promise<void> {
    await this.connectionHandler.disconnectPlayer(socketId);
  }

  /**
   * Handle a command from a player
   * Enqueues command for processing in the next game tick
   */
  async handleCommand(socketId: string, commandText: string): Promise<void> {
    this.commandQueue.enqueue({
      type: 'player',
      actorId: socketId,
      commandText,
      originalTimestamp: Date.now(),
    });
  }

  /**
   * Process a queued command (Internal logic)
   * Runs inside the game loop tick
   */
  private async processQueuedCommand(cmd: QueuedCommand): Promise<void> {
    let character: Character | null = null;

    // Resolve character based on command type
    if (cmd.type === 'player') {
      character = await this.characterManager.getCharacterBySocketId(cmd.actorId);
    } else {
      character = await findCharacterById(cmd.actorId);
    }

    if (!character) {
      console.warn(`Could not find character for ${cmd.type} command: ${cmd.actorId}`);
      return;
    }

    // Determine socketId for output (if player)
    const socketId =
      cmd.type === 'player' ? this.characterManager.getSocketIdForCharacter(character.id) : null;

    const context: CommandContext = {
      character,
    };

    // Persist command log
    await createPlayerLog(character.id, 'command', cmd.commandText);

    const result = await parseAndExecuteCommand(cmd.commandText, context);

    if (!result.success && result.error) {
      // Send error to player
      if (socketId) {
        this.io.to(socketId).emit('game:error', { message: result.error });
      }
      // Persist error
      await createPlayerLog(character.id, 'output', { type: 'error', message: result.error });
      return;
    }

    // Send structured output
    if (result.output) {
      if (socketId) {
        // Send to player
        this.io.to(socketId).emit('game:output', result.output);
      } else {
        // Queue for AI
        this.aiAgentManager.queueOutputForAgent(character.id, result.output);
      }
      // Persist output
      await createPlayerLog(character.id, 'output', result.output);
    }

    // Handle movement - persist character position to database
    const moveEvent = result.events.find((e) => e.type === 'movement');
    if (moveEvent?.data && this.isMovementData(moveEvent.data)) {
      await updateCharacter(character.id, { currentRoomId: moveEvent.data.toRoomId });
    }

    // Process command results (broadcast events, AI responses, stats, death)
    await this.commandHandler.processResults(result, character);
  }

  /**
   * Type guard for movement event data
   */
  private isMovementData(
    data: Record<string, unknown>,
  ): data is { fromRoomId: string; toRoomId: string; direction: string } {
    return (
      typeof data['fromRoomId'] === 'string' &&
      typeof data['toRoomId'] === 'string' &&
      typeof data['direction'] === 'string'
    );
  }

  /**
   * Get room state for a character
   */
  async getCharacterRoomState(characterId: string): Promise<RoomState> {
    return this.characterManager.getCharacterRoomState(characterId);
  }

  /**
   * Pause the game engine (stops AI proactive loop)
   */
  async pause(): Promise<void> {
    if (!this.paused) {
      this.paused = true;
      this.aiAgentManager.pauseProactiveLoop();
      this.worldClock.pause();
      await updateGameState({ isPaused: true });
      console.info('⏸️  Game engine paused');
    }
  }

  /**
   * Resume the game engine (restarts AI proactive loop)
   */
  async resume(): Promise<void> {
    if (this.paused) {
      this.paused = false;
      this.aiAgentManager.resumeProactiveLoop();
      this.worldClock.resume();
      await updateGameState({ isPaused: false });
      console.info('▶️  Game engine resumed');
    }
  }

  /**
   * Get current pause state
   */
  isPaused(): boolean {
    return this.paused;
  }
}
