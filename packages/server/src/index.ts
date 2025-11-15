/**
 * Server entry point - Express + Socket.io server
 * Iteration 0: Basic multiplayer with room navigation and chat
 */

import { createServer } from 'node:http';
import cors from 'cors';
import * as dotenv from 'dotenv';
import express from 'express';
import { Server } from 'socket.io';
import { GameEngine } from './game/engine.js';

dotenv.config({ path: '../../.env' });

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

  // Player joins game
  socket.on('player:join', (data: { name: string }, callback) => {
    try {
      const player = gameEngine.addPlayer(socket.id, data.name);
      const initialRoom = gameEngine.getPlayerRoomState(player.id);

      callback({ success: true, player, initialRoom });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join game';
      callback({ success: false, error: message });
    }
  });

  // Player sends command
  socket.on('game:command', (data: { command: string }) => {
    try {
      gameEngine.handleCommand(socket.id, data.command);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Command failed';
      socket.emit('game:error', { message });
    }
  });

  // Player disconnects
  socket.on('disconnect', () => {
    console.info(`Client disconnected: ${socket.id}`);
    gameEngine.removePlayer(socket.id);
  });
});

const portEnv = process.env['PORT'];
const PORT = portEnv ? Number.parseInt(portEnv, 10) : 3000;

httpServer.listen(PORT, () => {
  console.info(`🎮 Silt MUD Server running on port ${PORT}`);
  console.info('📡 WebSocket server ready');
  console.info('🌍 Starter world initialized with 3 rooms');
});
