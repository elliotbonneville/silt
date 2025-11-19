import type { Prisma } from '@prisma/client';
import { prisma } from './client.js';
import type { TokenUsageFilters } from './token-usage-repository.js';

export async function getTokenUsageLogs(filters: TokenUsageFilters = {}, limit = 100, offset = 0) {
  const whereClause: Prisma.TokenUsageWhereInput = {};

  if (filters.provider) whereClause.provider = { contains: filters.provider };
  if (filters.model) whereClause.model = filters.model;
  if (filters.source) whereClause.source = filters.source;
  if (filters.agentId) whereClause.agentId = filters.agentId;

  if (filters.startDate || filters.endDate) {
    whereClause.createdAt = {};
    if (filters.startDate) whereClause.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) whereClause.createdAt.lte = new Date(filters.endDate);
  }

  return prisma.tokenUsage.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}
