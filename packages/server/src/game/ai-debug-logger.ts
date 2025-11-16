/**
 * AI Debug Logger - tracks AI decisions for admin visibility
 */

interface AILogEntry {
  timestamp: number;
  agentId: string;
  agentName: string;
  event: 'decision' | 'action' | 'error';
  data: unknown;
}

class AIDebugLogger {
  private logs: AILogEntry[] = [];
  private maxLogs = 100;

  log(
    agentId: string,
    agentName: string,
    event: 'decision' | 'action' | 'error',
    data: unknown,
  ): void {
    this.logs.push({
      timestamp: Date.now(),
      agentId,
      agentName,
      event,
      data,
    });

    // Keep only last 100 logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also console log for real-time debugging
    console.info(`[AI ${agentName}] ${event}:`, JSON.stringify(data, null, 2));
  }

  getLogs(): readonly AILogEntry[] {
    return this.logs;
  }

  clear(): void {
    this.logs = [];
  }
}

export const aiDebugLogger = new AIDebugLogger();
