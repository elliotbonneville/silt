/**
 * OpenAPI spec generator from Zod schemas
 * Single source of truth: Prisma → Zod (generated) → OpenAPI → Client
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { CharacterSchema } from '../database/generated/index.js';

// Extend Zod with OpenAPI
extendZodWithOpenApi(z);

// Create registry
const registry = new OpenAPIRegistry();

// API-specific schemas built from generated Prisma Zod schemas
const CharacterListItemSchema = CharacterSchema.pick({
  id: true,
  name: true,
  isAlive: true,
  hp: true,
  maxHp: true,
})
  .extend({
    createdAt: z.string().openapi({ example: '2024-11-15T12:00:00Z' }),
    diedAt: z.string().optional().openapi({ example: '2024-11-15T13:00:00Z' }),
  })
  .openapi('CharacterListItem');

const CharacterResponseSchema = CharacterSchema.pick({
  id: true,
  name: true,
  isAlive: true,
  hp: true,
  maxHp: true,
  currentRoomId: true,
  attackPower: true,
  defense: true,
})
  .extend({
    createdAt: z.string().optional(),
  })
  .openapi('CharacterResponse');

const CreateCharacterRequestSchema = z
  .object({
    name: z.string().min(1).max(50),
  })
  .openapi('CreateCharacterRequest');

const ErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string(),
  })
  .openapi('Error');

// Schemas are registered via .openapi() above

// Register endpoints
registry.registerPath({
  method: 'get',
  path: '/api/accounts/{username}/characters',
  summary: 'List all characters for an account',
  tags: ['Characters'],
  request: {
    params: z.object({
      username: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'List of characters',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            characters: z.array(CharacterListItemSchema),
          }),
        },
      },
    },
    500: {
      description: 'Server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/accounts/{username}/characters',
  summary: 'Create a new character',
  tags: ['Characters'],
  request: {
    params: z.object({
      username: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: CreateCharacterRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Character created',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            character: CharacterResponseSchema,
          }),
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/characters/{id}',
  summary: 'Get character details',
  tags: ['Characters'],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Character details',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            character: CharacterResponseSchema,
          }),
        },
      },
    },
    404: {
      description: 'Character not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/health',
  summary: 'Health check',
  tags: ['System'],
  responses: {
    200: {
      description: 'Server is healthy',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('ok'),
            timestamp: z.number(),
          }),
        },
      },
    },
  },
});

// Generate OpenAPI spec
const generator = new OpenApiGeneratorV31(registry.definitions);
const docs = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'Silt MUD API',
    version: '1.0.0',
    description: 'REST API for character and account management',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
});

// Write to file as JSON (Kubb prefers JSON)
const outputPath = resolve(process.cwd(), 'openapi.json');
writeFileSync(outputPath, JSON.stringify(docs, null, 2));

// biome-ignore lint/suspicious/noConsole: Script output
console.log('✅ OpenAPI spec generated at:', outputPath);
