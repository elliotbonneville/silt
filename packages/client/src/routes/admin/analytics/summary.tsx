import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { API_URL } from './layout';
import type { TokenUsageStats } from './types';

export default function AnalyticsSummary() {
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState<TokenUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      // searchParams can be passed directly to fetch if we want,
      // but the API expects specific keys. Luckily searchParams matches.

      const response = await fetch(
        `${API_URL}/api/admin/analytics/tokens?${searchParams.toString()}`,
      );
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-lg bg-red-900/30 p-4 text-red-400 border border-red-800">
        {error || 'No data available'}
      </div>
    );
  }

  const formatCost = (cost: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(cost);

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

  return (
    <>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h3 className="text-sm font-medium text-gray-400">Total Cost</h3>
          <p className="mt-2 text-3xl font-bold text-green-400">{formatCost(stats.totalCost)}</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h3 className="text-sm font-medium text-gray-400">Total Tokens</h3>
          <p className="mt-2 text-3xl font-bold text-blue-400">{formatNumber(stats.totalTokens)}</p>
          <div className="mt-1 flex gap-2 text-xs text-gray-500">
            <span>
              In:{' '}
              {formatNumber(stats.byModel.reduce((acc, curr) => acc + curr._sum.promptTokens, 0))}
            </span>
            <span>
              Out:{' '}
              {formatNumber(
                stats.byModel.reduce((acc, curr) => acc + curr._sum.completionTokens, 0),
              )}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h3 className="text-sm font-medium text-gray-400">Requests</h3>
          <p className="mt-2 text-3xl font-bold text-purple-400">
            {formatNumber(stats.byModel.reduce((acc, curr) => acc + curr._count, 0))}
          </p>
        </div>
      </div>

      {/* Provider Info */}
      {stats.byProvider && stats.byProvider.length > 0 && (
        <div className="mb-8 rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4">AI Providers</h3>
          <div className="flex flex-wrap gap-4">
            {stats.byProvider.map((p) => (
              <div
                key={p.provider}
                className="flex items-center gap-3 rounded bg-gray-900/50 px-4 py-2 border border-gray-700"
              >
                <span className="text-white font-mono text-sm">{p.provider}</span>
                <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                  {p._count} reqs
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Breakdown by Model */}
      <div className="mb-8 rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
        <div className="bg-gray-900/50 px-6 py-4 border-b border-gray-700">
          <h3 className="font-bold text-white">Usage by Model</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="px-6 py-3 font-medium">Model</th>
                <th className="px-6 py-3 font-medium">Provider</th>
                <th className="px-6 py-3 font-medium text-right">Requests</th>
                <th className="px-6 py-3 font-medium text-right">Prompt Tokens</th>
                <th className="px-6 py-3 font-medium text-right">Completion Tokens</th>
                <th className="px-6 py-3 font-medium text-right">Total Tokens</th>
                <th className="px-6 py-3 font-medium text-right">Est. Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {stats.byModel.map((item) => (
                <tr key={`${item.provider}-${item.model}`} className="hover:bg-gray-700/50">
                  <td className="px-6 py-3 text-white">{item.model}</td>
                  <td className="px-6 py-3 text-gray-400 font-mono text-xs">
                    {item.provider || 'openai'}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-300">
                    {formatNumber(item._count)}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-300">
                    {formatNumber(item._sum.promptTokens)}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-300">
                    {formatNumber(item._sum.completionTokens)}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-300">
                    {formatNumber(item._sum.totalTokens)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-green-400">
                    {formatCost(item._sum.cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breakdown by Feature */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
        <div className="bg-gray-900/50 px-6 py-4 border-b border-gray-700">
          <h3 className="font-bold text-white">Usage by Feature</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.bySource.map((item) => (
            <div key={item.source} className="rounded border border-gray-700 bg-gray-900/30 p-4">
              <h4 className="font-semibold text-gray-200 mb-2 capitalize">
                {item.source.replace(/_/g, ' ')}
              </h4>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Tokens:</span>
                <span className="text-blue-300">{formatNumber(item._sum.totalTokens)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-400">Cost:</span>
                <span className="text-green-400">{formatCost(item._sum.cost)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
