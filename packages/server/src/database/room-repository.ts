/**
 * Room repository - database operations for rooms
 */

import type { Room } from '@prisma/client';
import type { RoomId } from '@silt/shared';
import { prisma } from './client.js';
import { parseRoomExits, type RoomExitsData } from './schemas.js';

export interface CreateRoomInput {
  readonly name: string;
  readonly description: string;
  readonly exits: Record<string, RoomId>; // { "north": "room-id", "east": "room-id" }
  readonly isStarting?: boolean;
  readonly createdBy?: string;
}

export interface UpdateRoomInput {
  readonly name?: string;
  readonly description?: string;
  readonly exits?: Record<string, RoomId>;
}

/**
 * Create a new room
 */
export async function createRoom(input: CreateRoomInput): Promise<Room> {
  const data: {
    name: string;
    description: string;
    exitsJson: string;
    isStarting: boolean;
    createdBy?: string;
  } = {
    name: input.name,
    description: input.description,
    exitsJson: JSON.stringify(input.exits),
    isStarting: input.isStarting ?? false,
  };

  if (input.createdBy !== undefined) {
    data.createdBy = input.createdBy;
  }

  return await prisma.room.create({ data });
}

/**
 * Find room by ID
 */
export async function findRoomById(id: RoomId): Promise<Room | null> {
  return await prisma.room.findUnique({
    where: { id },
  });
}

/**
 * Find starting room
 */
export async function findStartingRoom(): Promise<Room | null> {
  return await prisma.room.findFirst({
    where: { isStarting: true },
  });
}

/**
 * Find all rooms
 */
export async function findAllRooms(): Promise<Room[]> {
  return await prisma.room.findMany({
    orderBy: { name: 'asc' },
  });
}

/**
 * Update room
 */
export async function updateRoom(id: RoomId, input: UpdateRoomInput): Promise<Room> {
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData['name'] = input.name;
  if (input.description !== undefined) updateData['description'] = input.description;
  if (input.exits !== undefined) updateData['exitsJson'] = JSON.stringify(input.exits);

  return await prisma.room.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Delete room
 */
export async function deleteRoom(id: RoomId): Promise<void> {
  await prisma.room.delete({
    where: { id },
  });
}

/**
 * Get room exits as typed object
 */
export function getRoomExits(room: Room): RoomExitsData {
  return parseRoomExits(room.exitsJson);
}
