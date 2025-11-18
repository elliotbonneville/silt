/**
 * Event detail view - full inspection of a single event
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const serverUrl = import.meta.env.VITE_SERVER_URL;
const SERVER_URL = serverUrl ?? 'http://localhost:3000';

interface AdminGameEvent {
  id: string;
  type: string;
  timestamp: number;
  originRoomId: string;
  visibility: string;
  attenuated: boolean;
  content: string | null;
  data: Record<string, unknown>;
  recipients: string[];
}

export function EventDetail(): JSX.Element {
  const params = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<AdminGameEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedEvent, setCopiedEvent] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  async function copyToClipboard(text: string, setCopied: (val: boolean) => void): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  useEffect(() => {
    async function loadEvent(): Promise<void> {
      if (!params.eventId) return;

      try {
        // Query events endpoint to find this specific event
        const response = await fetch(`${SERVER_URL}/admin/events?limit=1000`);
        const data = await response.json();
        const found = data.events?.find((e: AdminGameEvent) => e.id === params.eventId);
        setEvent(found || null);
      } catch (error) {
        console.error('Failed to load event:', error);
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [params.eventId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-400">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-lg">Event not found</div>
          <Link to="/admin/events" className="text-cyan-400 hover:underline mt-4 block">
            ← Back to events
          </Link>
        </div>
      </div>
    );
  }

  const isAIEvent = event.type.startsWith('ai:');
  const promptSent =
    typeof event.data?.['promptSent'] === 'string' ? event.data['promptSent'] : null;
  const llmResponse =
    typeof event.data?.['llmResponse'] === 'string' ? event.data['llmResponse'] : null;
  const agentName = typeof event.data?.['agentName'] === 'string' ? event.data['agentName'] : null;

  return (
    <div className="h-full overflow-y-auto bg-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 z-10">
        <div className="flex items-center justify-between mb-3">
          <Link to="/admin/events" className="text-cyan-400 hover:text-cyan-300 text-sm">
            ← Back to events
          </Link>
          <button
            type="button"
            onClick={() => event && copyToClipboard(JSON.stringify(event, null, 2), setCopiedEvent)}
            className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
          >
            {copiedEvent ? '✓ Copied Event!' : '📋 Copy Event JSON'}
          </button>
        </div>
        <h1 className="text-2xl font-bold text-cyan-400 mb-2">{event.type}</h1>
        <div className="flex gap-4 text-sm text-gray-400">
          <span>{new Date(event.timestamp).toLocaleString()}</span>
          <span>•</span>
          <span>ID: {event.id}</span>
          {agentName && (
            <>
              <span>•</span>
              <span>Agent: {agentName}</span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Event Summary */}
        <Section title="Summary">
          <div className="text-gray-300">
            {event.content || <span className="text-gray-500 italic">No content</span>}
          </div>
        </Section>

        {/* AI Decision Context */}
        {isAIEvent && promptSent && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Prompt Sent to LLM</h3>
              <button
                type="button"
                onClick={() => copyToClipboard(promptSent, setCopiedPrompt)}
                className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
              >
                {copiedPrompt ? '✓ Copied!' : '📋 Copy Prompt'}
              </button>
            </div>
            <SyntaxHighlighter
              language="markdown"
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                border: '1px solid rgb(55, 65, 81)',
              }}
            >
              {promptSent}
            </SyntaxHighlighter>
          </div>
        )}

        {/* AI Response */}
        {isAIEvent && llmResponse && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">LLM Response</h3>
              <button
                type="button"
                onClick={() => copyToClipboard(llmResponse, setCopiedResponse)}
                className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
              >
                {copiedResponse ? '✓ Copied!' : '📋 Copy Response'}
              </button>
            </div>
            <SyntaxHighlighter
              language="markdown"
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                border: '1px solid rgb(55, 65, 81)',
              }}
            >
              {llmResponse}
            </SyntaxHighlighter>
          </div>
        )}

        {/* Full Event Data */}
        <Section title="Event Data">
          <div className="space-y-3">
            <DataRow label="Type" value={event.type} />
            <DataRow label="Timestamp" value={new Date(event.timestamp).toISOString()} />
            <DataRow label="Origin Room" value={event.originRoomId || '(none)'} />
            <DataRow label="Visibility" value={event.visibility} />
            <DataRow label="Attenuated" value={event.attenuated ? 'Yes' : 'No'} />
            <DataRow
              label="Recipients"
              value={event.recipients?.length > 0 ? event.recipients.join(', ') : '(none)'}
            />
          </div>
        </Section>

        {/* Additional Data Fields */}
        {Object.keys(event.data || {}).length > 0 && (
          <Section title="Additional Data">
            <div className="space-y-2">
              {Object.entries(event.data || {}).map(([key, value]) => {
                // Skip prompt and response (shown above)
                if (key === 'promptSent' || key === 'llmResponse') return null;

                return (
                  <div key={key} className="border-b border-gray-800 pb-2">
                    <div className="text-xs text-gray-500 mb-1">{key}</div>
                    <div className="text-sm text-gray-300">
                      {typeof value === 'object' ? (
                        <SyntaxHighlighter
                          language="json"
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                          }}
                        >
                          {JSON.stringify(value, null, 2)}
                        </SyntaxHighlighter>
                      ) : (
                        <span className="font-mono">{String(value)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
      <div className="bg-gray-800 p-4 rounded border border-gray-700">{children}</div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }): JSX.Element {
  return (
    <div className="flex items-start gap-4">
      <span className="text-gray-400 text-sm w-32 flex-shrink-0">{label}:</span>
      <div className="text-white text-sm font-mono flex-1 break-all">{value}</div>
    </div>
  );
}

export default EventDetail;
