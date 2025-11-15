/**
 * Server entry point - Express + Socket.io server
 * Iteration 1: Database-backed world with persistence
 */

import { createServer } from 'node:http';
import cors from 'cors';
import * as dotenv from 'dotenv';
import express from 'express';
import { Server } from 'socket.io';
import { GameEngine } from './game/engine.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const clientUrl = process.env['CLIENT_URL'] ?? 'http://localhost:5173';

const io = new Server(httpServer, {
  cors: {
    origin: clientUrl,
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Initialize game engine
const gameEngine = new GameEngine(io);

// WebSocket connection handling
io.on('connection', (socket) => {
  console.info(`Client connected: ${socket.id}`);

  // Get list of characters for a username
  socket.on('character:list', async (data: { username: string }, callback) => {
    try {
      const characters = await gameEngine.getCharactersForUsername(data.username);
      callback({ success: true, characters });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load characters';
      callback({ success: false, error: message });
    }
  });

  // Create a new character
  socket.on('character:create', async (data: { username: string; name: string }, callback) => {
    try {
      const character = await gameEngine.createNewCharacter(data.username, data.name);
      callback({ success: true, character });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create character';
      callback({ success: false, error: message });
    }
  });

  // Select and connect with a character
  socket.on('character:select', async (data: { characterId: string }, callback) => {
    try {
      const character = await gameEngine.connectPlayerToCharacter(socket.id, data.characterId);
      const initialRoom = gameEngine.getCharacterRoomState(character.id);

      callback({ success: true, character, initialRoom });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to select character';
      callback({ success: false, error: message });
    }
  });

  // Player sends command
  socket.on('game:command', async (data: { command: string }) => {
    try {
      await gameEngine.handleCommand(socket.id, data.command);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Command failed';
      socket.emit('game:error', { message });
    }
  });

  // Player disconnects
  socket.on('disconnect', async () => {
    console.info(`Client disconnected: ${socket.id}`);
    await gameEngine.disconnectPlayer(socket.id);
  });
});

const portEnv = process.env['PORT'];
const PORT = portEnv ? Number.parseInt(portEnv, 10) : 3000;

// Start server after initializing game engine
async function startServer(): Promise<void> {
  try {
    console.info('🔄 Initializing game engine...');
    await gameEngine.initialize();
    console.info('✅ Game engine initialized');

    httpServer.listen(PORT, () => {
      console.info(`🎮 Silt MUD Server running on port ${PORT}`);
      console.info('📡 WebSocket server ready');
      console.info('🌍 World loaded from database with 5 rooms');
      console.info('⚔️  Iteration 1: Combat & Items ready!');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch((error) => {
  console.error('Unexpected error during startup:', error);
  process.exit(1);
});
