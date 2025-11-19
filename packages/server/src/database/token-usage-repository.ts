import type { Prisma } from '@prisma/client';
import { prisma } from './client.js';

export interface TokenUsageData {
  model: string;
  provider?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  source: string;
  agentId?: string;
  sourceEventId?: string | undefined;
}

// Approximate costs per 1M tokens (as of late 2024)
// Costs are now keyed by provider -> model
const COSTS: Record<string, Record<string, { prompt: number; completion: number }>> = {
  openai: {
    'gpt-4o': { prompt: 2.5, completion: 10.0 },
    'gpt-4o-mini': { prompt: 0.15, completion: 0.6 },
    'gpt-4': { prompt: 30.0, completion: 60.0 },
    'gpt-3.5-turbo': { prompt: 0.5, completion: 1.5 },
  },
  cerebras: {
    'gpt-oss-120b': { prompt: 0.35, completion: 0.75 },
    'llama-3.1-70b': { prompt: 0.35, completion: 0.75 },
  },
};

export async function trackTokenUsage(data: TokenUsageData) {
  // Normalize provider to simple keys if it's a URL
  let providerKey = 'openai';
  const rawProvider = data.provider || 'openai';

  if (rawProvider.includes('cerebras')) {
    providerKey = 'cerebras';
  } else if (rawProvider.includes('openai') || rawProvider === 'openai') {
    providerKey = 'openai';
  } else {
    // Default fallback or unknown provider
    providerKey = 'openai';
  }

  const providerCosts = COSTS[providerKey] || COSTS['openai'];
  const defaultRates = COSTS['openai']?.['gpt-4o-mini'];

  if (!providerCosts || !defaultRates) {
    // This should never happen with hardcoded constants
    throw new Error('Invalid cost configuration');
  }

  // Safely access rates
  const rates = providerCosts[data.model]
    ? providerCosts[data.model]
    : providerCosts['gpt-4o-mini']
      ? providerCosts['gpt-4o-mini']
      : defaultRates;

  if (!rates) {
    throw new Error(`Could not determine rates for model ${data.model}`);
  }

  const cost =
    (data.promptTokens / 1000000) * rates.prompt +
    (data.completionTokens / 1000000) * rates.completion;

  return prisma.tokenUsage.create({
    data: {
      ...data,
      provider: rawProvider, // Store the original provider string (e.g. URL)
      sourceEventId: data.sourceEventId || null, // Ensure null, not undefined
      cost,
    },
  });
}

export interface TokenUsageFilters {
  provider?: string;
  model?: string;
  source?: string;
  agentId?: string;
  startDate?: string;
  endDate?: string;
}

export async function getFilterOptions() {
  const [providers, models, sources] = await Promise.all([
    prisma.tokenUsage.groupBy({ by: ['provider'] }),
    prisma.tokenUsage.groupBy({ by: ['model'] }),
    prisma.tokenUsage.groupBy({ by: ['source'] }),
  ]);

  return {
    providers: providers
      .map((p) => p.provider)
      .filter(Boolean)
      .sort(),
    models: models
      .map((m) => m.model)
      .filter(Boolean)
      .sort(),
    sources: sources
      .map((s) => s.source)
      .filter(Boolean)
      .sort(),
  };
}

export async function getTokenUsageStats(filters: TokenUsageFilters = {}) {
  const whereClause: Prisma.TokenUsageWhereInput = {};

  if (filters.provider) {
    // Simple partial match for provider URL
    whereClause.provider = { contains: filters.provider };
  }
  if (filters.model) whereClause.model = filters.model;
  if (filters.source) whereClause.source = filters.source;
  if (filters.agentId) whereClause.agentId = filters.agentId;

  if (filters.startDate || filters.endDate) {
    whereClause.createdAt = {};
    if (filters.startDate) whereClause.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) whereClause.createdAt.lte = new Date(filters.endDate);
  }

  // Aggregate by model and provider
  const byModel = await prisma.tokenUsage.groupBy({
    by: ['model', 'provider'],
    where: whereClause,
    _sum: {
      promptTokens: true,
      completionTokens: true,
      totalTokens: true,
      cost: true,
    },
    _count: true,
  });

  // Aggregate by source (feature)
  const bySource = await prisma.tokenUsage.groupBy({
    by: ['source'],
    where: whereClause,
    _sum: {
      cost: true,
      totalTokens: true,
    },
  });

  // Get recent usage for display (optional, but good for debugging)
  // Or better yet, just return provider info in the summary if consistent
  // For now, let's just group by provider too?
  const byProvider = await prisma.tokenUsage.groupBy({
    by: ['provider'],
    where: whereClause,
    _count: true,
  });

  // Total cost
  const total = await prisma.tokenUsage.aggregate({
    where: whereClause,
    _sum: {
      cost: true,
      totalTokens: true,
    },
  });

  return {
    byModel,
    bySource,
    byProvider,
    totalCost: total._sum.cost || 0,
    totalTokens: total._sum.totalTokens || 0,
  };
}

export async function getAgentTokenUsage(agentId: string) {
  return prisma.tokenUsage.aggregate({
    where: { agentId },
    _sum: {
      cost: true,
      totalTokens: true,
    },
  });
}
