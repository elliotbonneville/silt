export interface TokenUsageStats {
  byModel: Array<{
    model: string;
    provider?: string;
    _sum: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      cost: number;
    };
    _count: number;
  }>;
  bySource: Array<{
    source: string;
    _sum: {
      cost: number;
      totalTokens: number;
    };
  }>;
  byProvider: Array<{
    provider: string;
    _count: number;
  }>;
  totalCost: number;
  totalTokens: number;
}

export interface RequestLog {
  id: string;
  createdAt: string;
  source: string;
  model: string;
  provider?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  agentId?: string;
  sourceEventId?: string;
}

export interface AnalyticsFilters {
  provider: string;
  model: string;
  source: string;
  startDate: string;
  endDate: string;
}
