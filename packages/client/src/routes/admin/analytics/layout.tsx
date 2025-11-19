import { useEffect, useState } from 'react';
import { NavLink, Outlet, useSearchParams } from 'react-router';

export const API_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000';

export default function AnalyticsLayout() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter Options State
  const [filterOptions, setFilterOptions] = useState<{
    providers: string[];
    models: string[];
    sources: string[];
  }>({ providers: [], models: [], sources: [] });

  // Fetch filter options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/analytics/tokens/filters`);
        if (res.ok) setFilterOptions(await res.json());
      } catch (e) {
        console.error('Failed to fetch filter options', e);
      }
    };
    void fetchOptions();
  }, []);

  // Helper to update params
  const updateParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      return newParams;
    });
  };

  // Get current values
  const providerFilter = searchParams.get('provider') || '';
  const modelFilter = searchParams.get('model') || '';
  const sourceFilter = searchParams.get('source') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white">Token Usage Analytics</h2>
            <div className="flex rounded bg-gray-800 p-1">
              <NavLink
                to={`summary?${searchParams.toString()}`}
                className={({ isActive }) =>
                  `rounded px-3 py-1 text-sm font-medium transition-colors ${
                    isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`
                }
              >
                Summary
              </NavLink>
              <NavLink
                to={`requests?${searchParams.toString()}`}
                className={({ isActive }) =>
                  `rounded px-3 py-1 text-sm font-medium transition-colors ${
                    isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`
                }
              >
                Requests
              </NavLink>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <select
            className="rounded bg-gray-800 px-3 py-2 text-sm text-white border border-gray-700"
            value={providerFilter}
            onChange={(e) => updateParam('provider', e.target.value)}
          >
            <option value="">All Providers</option>
            {filterOptions.providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            className="rounded bg-gray-800 px-3 py-2 text-sm text-white border border-gray-700"
            value={modelFilter}
            onChange={(e) => updateParam('model', e.target.value)}
          >
            <option value="">All Models</option>
            {filterOptions.models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            className="rounded bg-gray-800 px-3 py-2 text-sm text-white border border-gray-700"
            value={sourceFilter}
            onChange={(e) => updateParam('source', e.target.value)}
          >
            <option value="">All Sources</option>
            {filterOptions.sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 rounded bg-gray-800 px-3 py-2 border border-gray-700">
            <span className="text-xs text-gray-400">From:</span>
            <input
              type="date"
              className="bg-transparent text-sm text-white outline-none"
              value={startDate}
              onChange={(e) => updateParam('startDate', e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 rounded bg-gray-800 px-3 py-2 border border-gray-700">
            <span className="text-xs text-gray-400">To:</span>
            <input
              type="date"
              className="bg-transparent text-sm text-white outline-none"
              value={endDate}
              onChange={(e) => updateParam('endDate', e.target.value)}
            />
          </div>
        </div>
      </div>

      <Outlet />
    </div>
  );
}
