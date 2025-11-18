/**
 * Game engine - integrates all game systems
 * Manages world state, actors, and event propagation
 */

import type { AIAgent, Character } from '@prisma/client';
import type { CharacterListItem, RoomState } from '@silt/shared';
import type { Server } from 'socket.io';
import {
  findCharacterById,
  findCharactersInRoom,
  updateCharacter,
} from '../database/character-repository.js';
import { getGameState, updateGameState } from '../database/game-state-repository.js';
import { createPlayerLog } from '../database/player-log-repository.js';
import { findRoomById } from '../database/room-repository.js';
import type { AIAction } from './ai/index.js';
import { AIService } from './ai/index.js';
import { AIAgentManager } from './ai-agent-manager.js';
import { aiDebugLogger } from './ai-debug-logger.js';
import { CharacterManager } from './character-manager.js';
import { CommandHandler } from './command-handler.js';
import { type CommandContext, parseAndExecuteCommand } from './commands.js';
import { ConnectionHandler } from './connection-handler.js';
import { EventPropagator } from './event-propagator.js';
import { transformRoom } from './room-formatter.js';

export class GameEngine {
  readonly characterManager: CharacterManager;
  private readonly aiAgentManager: AIAgentManager;
  private eventPropagator!: EventPropagator;
  private commandHandler!: CommandHandler;
  private connectionHandler!: ConnectionHandler;
  private initialized = false;
  private paused = false;

  constructor(private readonly io: Server) {
    this.characterManager = new CharacterManager(this.io);

    // Initialize AI service
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    const aiService = new AIService(apiKey);
    this.aiAgentManager = new AIAgentManager(
      aiService,
      async (id: string) => await findCharacterById(id),
      async (agent, character, action) => {
        await this.executeAIAction(agent, character, action);
      },
    );
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
    if (this.paused) {
      console.info('⏸️  Game engine starting in PAUSED state');
    }

    // Load AI agents
    const aiAgents = await this.aiAgentManager.loadAgents();
    console.info(`✅ Loaded ${aiAgents.length} AI agents`);

    // Initialize event propagator
    this.eventPropagator = new EventPropagator(this.characterManager, this.aiAgentManager, this.io);

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
    this.setupAdminHandlers();

    // Start AI proactive behavior loop (only if not paused)
    if (!this.paused) {
      this.aiAgentManager.startProactiveLoop();
    }

    // Initialize spatial memory in background (don't block startup)
    this.aiAgentManager
      .initializeSpatialMemory()
      .catch((error) => console.error('Failed to initialize spatial memory:', error));

    this.initialized = true;
  }

  /**
   * Set up admin socket event handlers
   */
  private setupAdminHandlers(): void {
    this.io.on('connection', (socket) => {
      socket.on('admin:join', () => {
        socket.join('admin');
        console.info(`Admin client connected: ${socket.id}`);
      });

      socket.on('admin:leave', () => {
        socket.leave('admin');
        console.info(`Admin client disconnected: ${socket.id}`);
      });
    });
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
   */
  async handleCommand(socketId: string, commandText: string): Promise<void> {
    const character = await this.characterManager.getCharacterBySocketId(socketId);
    if (!character) {
      throw new Error('Character not found');
    }

    const context: CommandContext = {
      character,
    };

    // Persist command
    await createPlayerLog(character.id, 'command', commandText);

    const result = await parseAndExecuteCommand(commandText, context);

    if (!result.success && result.error) {
      this.io.to(socketId).emit('game:error', { message: result.error });
      // Persist error
      await createPlayerLog(character.id, 'output', { type: 'error', message: result.error });
      return;
    }

    // Send structured output to command issuer (look, inventory, etc.)
    if (result.output) {
      this.io.to(socketId).emit('game:output', result.output);
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
    const character = await findCharacterById(characterId);
    if (!character) throw new Error('Character not found');

    const dbRoom = await findRoomById(character.currentRoomId);
    if (!dbRoom) throw new Error('Room not found');
    const room = transformRoom(dbRoom);

    const charactersInRoom = await findCharactersInRoom(character.currentRoomId);
    const occupants = charactersInRoom
      .filter((char) => char.id !== characterId)
      .map((char) => ({ id: char.id, name: char.name, type: 'player' as const }));

    const exitEntries = Array.from(room.exits.entries());
    const exits = await Promise.all(
      exitEntries.map(async ([direction, targetId]) => {
        const targetDbRoom = await findRoomById(targetId);
        return {
          direction,
          roomId: targetId,
          roomName: targetDbRoom?.name || 'Unknown',
        };
      }),
    );

    return {
      room: { id: room.id, name: room.name, description: room.description },
      exits,
      occupants,
      items: [],
    };
  }

  /**
   * Execute an AI-decided action
   */
  private async executeAIAction(
    _agent: AIAgent,
    character: Character,
    action: AIAction,
  ): Promise<void> {
    const commandString = this.aiAgentManager.buildCommandFromAction(action);

    const context: CommandContext = {
      character,
    };

    const result = await parseAndExecuteCommand(commandString, context);

    // Queue output for AI agent (so they see room descriptions, inventory, etc.)
    if (result.output) {
      this.aiAgentManager.queueOutputForAgent(character.id, result.output);
    }

    // Handle movement - persist character position to database
    const moveEvent = result.events.find((e) => e.type === 'movement');
    if (moveEvent?.data && this.isMovementData(moveEvent.data)) {
      await updateCharacter(character.id, { currentRoomId: moveEvent.data.toRoomId });
    }

    await this.commandHandler.processResults(result, character);
  }

  /**
   * Pause the game engine (stops AI proactive loop)
   */
  async pause(): Promise<void> {
    if (!this.paused) {
      this.paused = true;
      this.aiAgentManager.pauseProactiveLoop();
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
