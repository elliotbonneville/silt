/**
 * Agent relationships tab
 */

import { useOutletContext } from 'react-router';
import type { AIAgent } from './layout.js';

interface AgentContext {
  agent: AIAgent;
}

export function AgentRelationships(): JSX.Element {
  const { agent } = useOutletContext<AgentContext>();

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">Relationships</h3>
      {Object.keys(agent.relationships).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(agent.relationships).map(([name, data]) => {
            // Type-safe extraction from relationship data
            const sentiment =
              typeof data === 'object' &&
              data !== null &&
              'sentiment' in data &&
              typeof data.sentiment === 'number'
                ? data.sentiment
                : 0;
            const trust =
              typeof data === 'object' &&
              data !== null &&
              'trust' in data &&
              typeof data.trust === 'number'
                ? data.trust
                : 0;
            const familiarity =
              typeof data === 'object' &&
              data !== null &&
              'familiarity' in data &&
              typeof data.familiarity === 'number'
                ? data.familiarity
                : 0;
            const role =
              typeof data === 'object' &&
              data !== null &&
              'role' in data &&
              typeof data.role === 'string'
                ? data.role
                : 'Unknown';
            const lastSeen =
              typeof data === 'object' &&
              data !== null &&
              'lastSeen' in data &&
              typeof data.lastSeen === 'string'
                ? data.lastSeen
                : 'Never';

            return (
              <div key={name} className="bg-gray-900 p-4 rounded">
                <div className="font-semibold text-cyan-400 mb-2">{name}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-400">Sentiment:</div>
                  <div className="text-white">{sentiment}/10</div>
                  <div className="text-gray-400">Trust:</div>
                  <div className="text-white">{trust}/10</div>
                  <div className="text-gray-400">Familiarity:</div>
                  <div className="text-white">{familiarity}</div>
                  <div className="text-gray-400">Role:</div>
                  <div className="text-white">{role}</div>
                  <div className="text-gray-400">Last Seen:</div>
                  <div className="text-white">{lastSeen}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-900 p-4 rounded text-gray-500 italic">
          No relationships established yet.
        </div>
      )}
    </div>
  );
}

export default AgentRelationships;
