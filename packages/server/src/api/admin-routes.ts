/**
 * Admin routes - debugging and monitoring endpoints
 */

import type { Express } from 'express';
import { aiDebugLogger } from '../game/ai-debug-logger.js';

export function setupAdminRoutes(app: Express): void {
  /**
   * GET /admin/ai-logs - View AI decision logs
   */
  app.get('/admin/ai-logs', (_req, res) => {
    const logs = aiDebugLogger.getLogs();
    res.json({
      logs,
      count: logs.length,
      timestamp: Date.now(),
    });
  });

  /**
   * POST /admin/ai-logs/clear - Clear AI logs
   */
  app.post('/admin/ai-logs/clear', (_req, res) => {
    aiDebugLogger.clear();
    res.json({ success: true, message: 'AI logs cleared' });
  });
}
