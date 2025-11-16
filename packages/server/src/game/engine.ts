/**
 * Game engine - integrates all game systems
 * Manages world state, actors, and event propagation
 */

import type { Character } from '@prisma/client';
import type { CharacterListItem, RoomState } from '@silt/shared';
import { nanoid } from 'nanoid';
import type { Server } from 'socket.io';
import { ActorRegistry } from './actor-registry.js';
import { AIAgentManager } from './ai-agent-manager.js';
import { AIService } from './ai-service.js';
import { CharacterManager } from './character-manager.js';
import { CommandHandler } from './command-handler.js';
import { type CommandContext, parseAndExecuteCommand } from './commands.js';
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
  private initialized = false;

  constructor(private readonly io: Server) {
    this.world = new World();
    this.characterManager = new CharacterManager(this.world);
    this.actorRegistry = new ActorRegistry();

    // Initialize AI service (uses mock mode if no real API key)
    const apiKey = process.env['OPENAI_API_KEY'] || 'mock';
    const aiService = new AIService(apiKey);
    this.aiAgentManager = new AIAgentManager(aiService);

    console.info(
      apiKey === 'mock' ? '🤖 AI Service: MOCK MODE (no API calls)' : '🤖 AI Service: OpenAI API',
    );
  }

  /**
   * Initialize the game engine - load world from database
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load world from database
    await this.world.initialize();

    // Load NPC characters into memory and register as actors
    const npcs = await this.characterManager.loadNPCs();
    for (const npc of npcs) {
      this.actorRegistry.addAIAgent(npc.id, npc.currentRoomId);
    }

    // Load AI agents
    const aiAgents = await this.aiAgentManager.loadAgents();
    console.info(`✅ Loaded ${aiAgents.length} AI agents`);

    // Set up player lookup for room descriptions
    this.world.setPlayerLookupFunction((roomId) =>
      Array.from(this.actorRegistry.getActorsInRoom(roomId))
        .map((id) => this.characterManager.getCharacter(id))
        .filter((char) => char !== null && char !== undefined)
        .map((char) => ({ name: char.name })),
    );

    // Build room graph and event propagator (with broadcasting capability)
    this.roomGraph = new RoomGraph(this.world.getAllRooms());
    this.eventPropagator = new EventPropagator(this.roomGraph, this.actorRegistry, this.io);

    // Initialize command handler
    this.commandHandler = new CommandHandler(
      this.characterManager,
      this.aiAgentManager,
      this.eventPropagator,
    );

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
    if (!this.initialized) {
      throw new Error('Game engine not initialized');
    }

    const character = await this.characterManager.connectPlayer(socketId, characterId);
    this.actorRegistry.addPlayer(characterId, character.currentRoomId, socketId);

    // Broadcast player entered event
    this.eventPropagator.broadcast({
      id: `event-${nanoid()}`,
      type: 'player_entered',
      timestamp: Date.now(),
      originRoomId: character.currentRoomId,
      content: `${character.name} has entered the room.`,
      relatedEntities: [],
      visibility: 'room',
    });

    // Send initial room description (private event, send directly)
    const roomDescription = await this.world.getRoomDescription(
      character.currentRoomId,
      character.name,
    );
    this.io.to(socketId).emit('game:event', {
      id: `event-${nanoid()}`,
      type: 'room_description',
      timestamp: Date.now(),
      originRoomId: character.currentRoomId,
      content: roomDescription,
      relatedEntities: [],
      visibility: 'private',
    });

    return character;
  }

  /**
   * Disconnect a player
   */
  async disconnectPlayer(socketId: string): Promise<void> {
    const character = await this.characterManager.disconnectPlayer(socketId);
    if (!character) return;

    this.eventPropagator.broadcast({
      id: `event-${nanoid()}`,
      type: 'player_left',
      timestamp: Date.now(),
      originRoomId: character.currentRoomId,
      content: `${character.name} has left the room.`,
      relatedEntities: [],
      visibility: 'room',
    });

    this.actorRegistry.removeBySocketId(socketId);
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
}
