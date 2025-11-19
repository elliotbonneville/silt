import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { API_URL } from './layout';
import type { RequestLog } from './types';

export default function AnalyticsRequests() {
  const [searchParams] = useSearchParams();
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams(searchParams);
        if (!params.has('limit')) params.set('limit', '50');

        const res = await fetch(`${API_URL}/api/admin/analytics/tokens/logs?${params.toString()}`);
        if (res.ok) {
          setLogs(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    void fetchLogs();
  }, [searchParams]);

  if (loading) return <div className="text-gray-400">Loading logs...</div>;

  const formatCost = (cost: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(cost);

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 bg-gray-900/50">
              <th className="px-6 py-3 font-medium">Time</th>
              <th className="px-6 py-3 font-medium">Source</th>
              <th className="px-6 py-3 font-medium">Model</th>
              <th className="px-6 py-3 font-medium">Provider</th>
              <th className="px-6 py-3 font-medium text-right">Input</th>
              <th className="px-6 py-3 font-medium text-right">Output</th>
              <th className="px-6 py-3 font-medium text-right">Total</th>
              <th className="px-6 py-3 font-medium text-right">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-700/50">
                <td className="px-6 py-3 text-gray-400 text-xs">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-3 text-white capitalize">
                  {log.sourceEventId ? (
                    <Link
                      to={`/admin/events/${log.sourceEventId}`}
                      className="text-blue-400 hover:underline"
                    >
                      {log.source.replace(/_/g, ' ')}
                    </Link>
                  ) : (
                    log.source.replace(/_/g, ' ')
                  )}
                </td>
                <td className="px-6 py-3 text-white">{log.model}</td>
                <td className="px-6 py-3 text-gray-400 font-mono text-xs">
                  {log.provider || 'openai'}
                </td>
                <td className="px-6 py-3 text-right text-gray-300">
                  {formatNumber(log.promptTokens)}
                </td>
                <td className="px-6 py-3 text-right text-gray-300">
                  {formatNumber(log.completionTokens)}
                </td>
                <td className="px-6 py-3 text-right text-blue-300 font-medium">
                  {formatNumber(log.totalTokens)}
                </td>
                <td className="px-6 py-3 text-right font-mono text-green-400">
                  {formatCost(log.cost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
