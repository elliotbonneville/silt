import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { getTokenUsageLogs } from '../database/token-usage-logs-repository.js';
import {
  getAgentTokenUsage,
  getFilterOptions,
  getTokenUsageStats,
  type TokenUsageFilters,
} from '../database/token-usage-repository.js';

// Validation schemas
const FilterSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  source: z.string().optional(),
  agentId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

function cleanFilters(data: z.infer<typeof FilterSchema>): TokenUsageFilters {
  const filters: TokenUsageFilters = {};
  if (data.provider !== undefined) filters.provider = data.provider;
  if (data.model !== undefined) filters.model = data.model;
  if (data.source !== undefined) filters.source = data.source;
  if (data.agentId !== undefined) filters.agentId = data.agentId;
  if (data.startDate !== undefined) filters.startDate = data.startDate;
  if (data.endDate !== undefined) filters.endDate = data.endDate;
  return filters;
}

export function setupAnalyticsRoutes(app: Express) {
  app.get('/api/admin/analytics/tokens/filters', async (_req: Request, res: Response) => {
    try {
      const options = await getFilterOptions();
      res.json(options);
    } catch (error) {
      console.error('Failed to get token usage filter options:', error);
      res.status(500).json({ error: 'Failed to fetch token usage filter options' });
    }
  });

  app.get('/api/admin/analytics/tokens', async (req: Request, res: Response) => {
    try {
      // Validate query params using Zod
      const result = FilterSchema.safeParse(req.query);

      if (!result.success) {
        res.status(400).json({ error: 'Invalid query parameters', details: result.error.issues });
        return;
      }

      const stats = await getTokenUsageStats(cleanFilters(result.data));
      res.json(stats);
    } catch (error) {
      console.error('Failed to get token usage stats:', error);
      res.status(500).json({ error: 'Failed to fetch token usage stats' });
    }
  });

  app.get('/api/admin/analytics/tokens/logs', async (req: Request, res: Response) => {
    try {
      const filterResult = FilterSchema.safeParse(req.query);
      const paginationResult = PaginationSchema.safeParse(req.query);

      if (!filterResult.success || !paginationResult.success) {
        const errors = [
          ...(filterResult.success ? [] : filterResult.error.issues),
          ...(paginationResult.success ? [] : paginationResult.error.issues),
        ];
        res.status(400).json({ error: 'Invalid query parameters', details: errors });
        return;
      }

      const logs = await getTokenUsageLogs(
        cleanFilters(filterResult.data),
        paginationResult.data.limit,
        paginationResult.data.offset,
      );
      res.json(logs);
    } catch (error) {
      console.error('Failed to get token usage logs:', error);
      res.status(500).json({ error: 'Failed to fetch token usage logs' });
    }
  });

  app.get('/api/admin/analytics/tokens/agent/:agentId', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      if (!agentId) {
        res.status(400).json({ error: 'Agent ID is required' });
        return;
      }
      const stats = await getAgentTokenUsage(agentId);
      res.json(stats);
    } catch (error) {
      console.error('Failed to get agent token usage:', error);
      res.status(500).json({ error: 'Failed to fetch agent token usage' });
    }
  });
}
