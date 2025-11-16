/**
 * Game engine - integrates all game systems
 * Manages world state, actors, and event propagation
 */

import type { AIAgent, Character } from '@prisma/client';
import type { CharacterListItem, RoomState } from '@silt/shared';
import type { Server } from 'socket.io';
import { updateCharacter } from '../database/character-repository.js';
import { AIAgentActor } from './actor-interface.js';
import { ActorRegistry } from './actor-registry.js';
import type { AIAction } from './ai/index.js';
import { AIService } from './ai/index.js';
import { AIAgentManager } from './ai-agent-manager.js';
import { aiDebugLogger } from './ai-debug-logger.js';
import { CharacterManager } from './character-manager.js';
import { CommandHandler } from './command-handler.js';
import { type CommandContext, parseAndExecuteCommand } from './commands.js';
import { ConnectionHandler } from './connection-handler.js';
import { EventPropagator } from './event-propagator.js';
import { RoomGraph } from './room-graph.js';
import { World } from './world.js';

export class GameEngine {
  private readonly world: World;
  readonly characterManager: CharacterManager;
  private readonly actorRegistry: ActorRegistry;
  private readonly aiAgentManager: AIAgentManager;
  private roomGraph!: RoomGraph;
  private eventPropagator!: EventPropagator;
  private commandHandler!: CommandHandler;
  private connectionHandler!: ConnectionHandler;
  private initialized = false;

  constructor(private readonly io: Server) {
    this.world = new World();
    this.characterManager = new CharacterManager(this.world);
    this.actorRegistry = new ActorRegistry();

    // Initialize AI service
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    const aiService = new AIService(apiKey);
    this.aiAgentManager = new AIAgentManager(
      aiService,
      (id: string) => this.characterManager.getCharacter(id),
      (roomId: string) => this.characterManager.getCharactersInRoom(roomId),
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

    // Load world from database
    await this.world.initialize();

    // Load NPC characters into memory
    const npcs = await this.characterManager.loadNPCs();

    // Load AI agents and create actor instances
    const aiAgents = await this.aiAgentManager.loadAgents();
    const aiAgentCharacterIds = new Set(aiAgents.map((a) => a.characterId));

    for (const npc of npcs) {
      // Create AI actor if this NPC has AI agent data
      if (aiAgentCharacterIds.has(npc.id)) {
        const aiActor = new AIAgentActor(npc.id, this.aiAgentManager);
        this.actorRegistry.addAIAgent(npc.id, npc.currentRoomId, aiActor);
      } else {
        // Regular NPC without AI (like Training Dummy) - no actor instance needed yet
        this.actorRegistry.addAIAgent(npc.id, npc.currentRoomId, {
          id: npc.id,
          actorType: 'ai_agent',
          handleEvent: () => {}, // No-op for non-AI NPCs
        });
      }
    }

    console.info(`✅ Loaded ${aiAgents.length} AI agents`);

    // Set up player lookup for room descriptions
    this.world.setPlayerLookupFunction((roomId) =>
      Array.from(this.actorRegistry.getActorsInRoom(roomId))
        .map((id) => this.characterManager.getCharacter(id))
        .filter((char) => char !== null && char !== undefined)
        .map((char) => ({ name: char.name })),
    );

    // Build room graph and event propagator
    this.roomGraph = new RoomGraph(this.world.getAllRooms());
    this.eventPropagator = new EventPropagator(this.roomGraph, this.actorRegistry, this.io);

    // Initialize command handler
    this.commandHandler = new CommandHandler(this.characterManager, this.eventPropagator);

    this.connectionHandler = new ConnectionHandler(
      this.io,
      this.characterManager,
      this.actorRegistry,
      this.eventPropagator,
      this.world,
    );

    // Set up AI debug logger to broadcast through event system
    aiDebugLogger.setEventPropagator(this.eventPropagator);

    // Set up admin socket handlers
    this.setupAdminHandlers();

    // Start AI proactive behavior loop
    this.aiAgentManager.startProactiveLoop();

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
    const character = this.characterManager.getCharacterBySocketId(socketId);
    if (!character) {
      throw new Error('Character not found');
    }

    const context: CommandContext = {
      character,
      world: this.world,
      getCharacterInRoom: (roomId: string, name: string) =>
        this.characterManager.getCharacterInRoom(roomId, name),
    };

    const result = await parseAndExecuteCommand(commandText, context);

    if (!result.success && result.error) {
      this.io.to(socketId).emit('game:error', { message: result.error });
      return;
    }

    // Send structured output to command issuer (look, inventory, etc.)
    if (result.output) {
      this.io.to(socketId).emit('game:output', result.output);
    }

    // Handle movement
    const moveEvent = result.events.find((e) => e.type === 'movement');
    if (moveEvent?.data && this.isMovementData(moveEvent.data)) {
      character.currentRoomId = moveEvent.data.toRoomId;
      this.actorRegistry.moveActor(
        character.id,
        moveEvent.data.fromRoomId,
        moveEvent.data.toRoomId,
      );

      // Persist character position to database
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
  getCharacterRoomState(characterId: string): RoomState {
    const character = this.characterManager.getCharacter(characterId);
    if (!character) throw new Error('Character not found');

    const room = this.world.getRoom(character.currentRoomId);
    if (!room) throw new Error('Room not found');

    const occupants = Array.from(this.actorRegistry.getActorsInRoom(character.currentRoomId))
      .filter((id) => id !== characterId)
      .map((id) => this.characterManager.getCharacter(id))
      .filter((char): char is Character => char !== null && char !== undefined)
      .map((char) => ({ id: char.id, name: char.name, type: 'player' as const }));

    const exits = Array.from(room.exits.entries()).map(([direction, targetId]) => ({
      direction,
      roomId: targetId,
      roomName: this.world.getRoom(targetId)?.name || 'Unknown',
    }));

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
      world: this.world,
      getCharacterInRoom: (roomId: string, name: string) =>
        this.characterManager.getCharacterInRoom(roomId, name),
    };

    const result = await parseAndExecuteCommand(commandString, context);

    // Handle movement
    const moveEvent = result.events.find((e) => e.type === 'movement');
    if (moveEvent?.data && this.isMovementData(moveEvent.data)) {
      character.currentRoomId = moveEvent.data.toRoomId;
      this.actorRegistry.moveActor(
        character.id,
        moveEvent.data.fromRoomId,
        moveEvent.data.toRoomId,
      );
    }

    await this.commandHandler.processResults(result, character);
  }
}
