/**
 * Agent conversation history tab
 */

import { useOutletContext } from 'react-router';
import type { AIAgent } from './layout.js';

interface AgentContext {
  agent: AIAgent;
}

export function AgentConversation(): JSX.Element {
  const { agent } = useOutletContext<AgentContext>();

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">Conversation History</h3>
      {agent.conversationHistory.length > 0 ? (
        <div className="space-y-2">
          {agent.conversationHistory.map((msg) => (
            <div key={`${msg.timestamp}-${msg.speaker}`} className="bg-gray-900 p-3 rounded">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-cyan-400">{msg.speaker}</span>
                <span className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-sm text-gray-300">{msg.message}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 p-4 rounded text-gray-500 italic">
          No conversation history yet.
        </div>
      )}
    </div>
  );
}

export default AgentConversation;
