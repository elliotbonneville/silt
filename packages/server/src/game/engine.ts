/**
 * Game engine - integrates all game systems
 * Manages world state, actors, and event propagation
 */

import type { Character } from '@prisma/client';
import type { CharacterListItem, RoomState } from '@silt/shared';
import type { Server } from 'socket.io';
import { findCharacterById } from '../database/character-repository.js';
import { prisma } from '../database/client.js';
import { getGameState, updateGameState } from '../database/game-state-repository.js';
import { setupAdminHandlers } from './admin-handler.js';
import { AIService } from './ai/index.js';
import { AIAgentManager } from './ai-agent-manager.js';
import { aiDebugLogger } from './ai-debug-logger.js';
import { CharacterManager } from './character-manager.js';
import { CommandHandler } from './command-handler.js';
import { CommandProcessor } from './command-processor.js';
import { ConnectionHandler } from './connection-handler.js';
import { EventPropagator } from './event-propagator.js';
import { CombatSystem } from './systems/combat-system.js';
import { CommandQueue, type QueuedCommand } from './systems/command-queue.js';
import { GameLoop } from './systems/game-loop.js';
import { WorldClock } from './systems/world-clock.js';

export class GameEngine {
  readonly characterManager: CharacterManager;
  private readonly aiAgentManager: AIAgentManager;
  private readonly gameLoop: GameLoop;
  private readonly worldClock: WorldClock;
  private readonly commandQueue: CommandQueue;
  private eventPropagator: EventPropagator | null = null;
  private commandHandler: CommandHandler | null = null;
  private connectionHandler: ConnectionHandler | null = null;
  private combatSystem: CombatSystem | null = null;
  private commandProcessor: CommandProcessor | null = null;
  private initialized = false;
  private paused = false;

  constructor(private readonly io: Server) {
    this.characterManager = new CharacterManager(this.io);
    this.gameLoop = new GameLoop();
    this.worldClock = new WorldClock();
    this.commandQueue = new CommandQueue(this.processQueuedCommand.bind(this));

    const apiKey = process.env['OPENAI_API_KEY'];
    const baseURL = process.env['OPENAI_BASE_URL'];

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    const aiService = new AIService(apiKey, baseURL);
    console.info(
      `🤖 AI Service: Connected to ${baseURL || 'OpenAI Default'} with model ${process.env['OPENAI_MODEL'] || 'gpt-4o-mini'}`,
    );
    if (baseURL) {
      console.info(`🌐 AI Provider URL: ${baseURL}`);
    }
    console.info(`🔑 API Key starts with: ${apiKey.substring(0, 8)}...`);

    this.aiAgentManager = new AIAgentManager(
      aiService,
      async (id: string) => await findCharacterById(id),
      async (_agent, character, action) => {
        const commandText = this.aiAgentManager.buildCommandFromAction(action);
        this.commandQueue.enqueue({
          type: 'ai',
          actorId: character.id,
          commandText,
          originalTimestamp: Date.now(),
        });
      },
    );

    this.gameLoop.addSystem(this.worldClock);
    this.gameLoop.addSystem(this.commandQueue);
    this.gameLoop.addSystem(this.aiAgentManager);
    console.info('🤖 AI Service: OpenAI API ready');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const gameState = await getGameState();
    this.paused = gameState.isPaused;
    if (gameState.gameTime) {
      this.worldClock.setGameTime(Number(gameState.gameTime));
    }

    if (this.paused) {
      console.info('⏸️  Game engine starting in PAUSED state');
      this.worldClock.pause();
    }

    this.eventPropagator = new EventPropagator(this.characterManager, this.aiAgentManager, this.io);
    this.combatSystem = new CombatSystem(this.eventPropagator);
    this.commandHandler = new CommandHandler(this.characterManager, this.eventPropagator);

    this.gameLoop.addSystem(this.eventPropagator);
    this.gameLoop.addSystem(this.combatSystem);

    this.commandProcessor = new CommandProcessor(
      this.io,
      this.characterManager,
      this.aiAgentManager,
      this.commandHandler,
      this.combatSystem,
    );

    this.connectionHandler = new ConnectionHandler(
      this.io,
      this.characterManager,
      this.eventPropagator,
    );

    aiDebugLogger.setEventPropagator(this.eventPropagator);

    setupAdminHandlers(this.io);

    const aiAgents = await this.aiAgentManager.loadAgents();
    console.info(`✅ Loaded ${aiAgents.length} AI agents`);

    if (!this.paused) {
      this.aiAgentManager.startProactiveLoop();
    }

    this.gameLoop.start();

    this.aiAgentManager.initializeSpatialMemory().catch((err) => {
      console.error('Failed to initialize spatial memory:', err);
    });

    this.initialized = true;
    console.info('✅ Game engine initialized successfully');
  }

  async shutdown(): Promise<void> {
    console.info('🛑 Shutting down game engine...');
    this.gameLoop.stop();
    this.aiAgentManager.stopProactiveLoop();
    await this.aiAgentManager.saveEventQueuesToDatabase();
    await updateGameState({ gameTime: BigInt(this.worldClock.time) });
    console.info('✅ Game engine shut down complete');
  }

  async getCharactersForUsername(username: string): Promise<CharacterListItem[]> {
    return this.characterManager.getCharactersForUsername(username);
  }

  async createNewCharacter(username: string, name: string): Promise<Character> {
    if (!this.initialized) throw new Error('Game engine not initialized');
    return this.characterManager.createNewCharacter(username, name);
  }

  async connectPlayerToCharacter(socketId: string, characterId: string): Promise<Character> {
    if (!this.initialized || !this.connectionHandler)
      throw new Error('Game engine not initialized');
    return this.connectionHandler.connectPlayer(socketId, characterId);
  }

  async disconnectPlayer(socketId: string): Promise<void> {
    if (!this.connectionHandler) throw new Error('Game engine not initialized');
    await this.connectionHandler.disconnectPlayer(socketId);
  }

  async handleCommand(socketId: string, commandText: string): Promise<void> {
    await this.onPlayerCommand(socketId, commandText);
  }

  async emitCharacterList(): Promise<void> {
    // Get all connected players
    const allCharacters = await prisma.character.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const characters: CharacterListItem[] = allCharacters.map((char) => {
      const item: CharacterListItem = {
        id: char.id,
        name: char.name,
        isAlive: char.isAlive,
        hp: char.hp,
        maxHp: char.maxHp,
        createdAt: char.createdAt.toISOString(),
      };
      if (char.diedAt) {
        return { ...item, diedAt: char.diedAt.toISOString() };
      }
      return item;
    });

    this.io.emit('admin:characters', { characters });
  }

  async onPlayerCommand(socketId: string, commandText: string): Promise<void> {
    this.commandQueue.enqueue({
      type: 'player',
      actorId: socketId,
      commandText,
      originalTimestamp: Date.now(),
    });
  }

  private async processQueuedCommand(cmd: QueuedCommand): Promise<void> {
    if (!this.commandProcessor) {
      throw new Error('Game engine not initialized');
    }
    await this.commandProcessor.processCommand(cmd);
  }

  async getCharacterRoomState(characterId: string): Promise<RoomState> {
    return this.characterManager.getCharacterRoomState(characterId);
  }

  async pause(): Promise<void> {
    if (!this.paused) {
      this.paused = true;
      this.aiAgentManager.pauseProactiveLoop();
      this.worldClock.pause();
      await updateGameState({ isPaused: true });
      console.info('⏸️  Game engine paused');
    }
  }

  async resume(): Promise<void> {
    if (this.paused) {
      this.paused = false;
      this.aiAgentManager.resumeProactiveLoop();
      this.worldClock.resume();
      await updateGameState({ isPaused: false });
      console.info('▶️  Game engine resumed');
    }
  }

  isPaused(): boolean {
    return this.paused;
  }

  getWorldClock(): WorldClock {
    return this.worldClock;
  }
}
