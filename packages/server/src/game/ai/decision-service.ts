/**
 * Decision service - LLM-based decision making for AI actions and responses
 */

import type OpenAI from 'openai';
import { z } from 'zod';
import { generateOpenAIFunctionSchemas } from '../command-registry.js';
import type { AIAction, AIDecision, RelationshipData } from './types.js';
import { AIDecisionSchema } from './types.js';

/**
 * Decide what action AI should take (for proactive behavior)
 */
export async function decideAction(
  client: OpenAI,
  agentPersonality: string,
  agentName: string,
  recentEvents: string[],
  relationships: Map<string, RelationshipData>,
  timeSinceLastAction: number,
  roomContext: string,
): Promise<AIAction | null> {
  const tools = generateOpenAIFunctionSchemas();

  const relContext = Array.from(relationships.entries())
    .map(([name, rel]) => `- ${name}: familiarity ${rel.familiarity}, trust ${rel.trust}/10`)
    .join('\n');

  const prompt = `You are ${agentName}. ${agentPersonality}

Recent events you witnessed:
${recentEvents.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Relationships:
${relContext || 'No relationships yet'}

Last acted: ${timeSinceLastAction} seconds ago
Room: ${roomContext}

Available actions: ${tools.map((t) => t.function.name).join(', ')}

Decide what to do. You can:
- Attack threats
- Pick up useful items
- Move around (stay near your home)
- Say something
- Do nothing (wait and observe)

Consider your personality and the situation. Don't spam actions.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    tools,
    tool_choice: 'auto',
    max_tokens: 150,
    temperature: 0.8,
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.type !== 'function') {
    return null; // AI chose to do nothing
  }

  try {
    const parsedArgs: unknown = JSON.parse(toolCall.function.arguments);

    // Use Zod to validate it's a record
    const argsSchema = z.record(z.string(), z.unknown());
    const result = argsSchema.safeParse(parsedArgs);

    if (!result.success) {
      console.error('Failed to parse AI action arguments:', result.error);
      return null;
    }

    return {
      action: toolCall.function.name,
      arguments: result.data,
      reasoning: 'AI function call',
    };
  } catch {
    return null;
  }
}

/**
 * Decide if AI should respond to recent events
 */
export async function decideResponse(
  client: OpenAI,
  agentPersonality: string,
  agentName: string,
  recentEvents: string[],
  relationships: Map<string, RelationshipData>,
  timeSinceLastResponse: number,
  roomContext: string,
): Promise<AIDecision> {
  // Build relationships context
  const relContext = Array.from(relationships.entries())
    .map(([name, rel]) => `- ${name}: familiarity ${rel.familiarity}, trust ${rel.trust}/10`)
    .join('\n');

  const prompt = `You are ${agentName}. ${agentPersonality}

Recent events you witnessed:
${recentEvents.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Relationships with people present:
${relContext || 'No prior relationships'}

Last spoke: ${timeSinceLastResponse} seconds ago
Room: ${roomContext}

Rules for speaking:
- Speak when directly addressed by name
- Greet newcomers
- React to dramatic events (deaths, victories)
- Don't interrupt private conversations
- Wait at least 3 seconds between comments
- Keep responses to 1-2 sentences max

Should you say something? Respond with JSON only:
{
  "shouldRespond": true or false,
  "response": "your message" or null,
  "reasoning": "why you decided this"
}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 200,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return { shouldRespond: false, response: null };
  }

  try {
    const parsed: unknown = JSON.parse(content);
    const result = AIDecisionSchema.safeParse(parsed);

    if (!result.success) {
      console.error('Failed to parse AI decision:', result.error);
      return { shouldRespond: false, response: null };
    }

    return result.data;
  } catch (error) {
    console.error('Failed to parse AI response JSON:', error);
    return { shouldRespond: false, response: null };
  }
}
