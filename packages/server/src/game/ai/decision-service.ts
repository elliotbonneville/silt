/**
 * Decision service - LLM-based decision making for AI actions and responses
 */

import type OpenAI from 'openai';
import { z } from 'zod';
import { trackTokenUsage } from '../../database/token-usage-repository.js';
import { generateOpenAIFunctionSchemas } from '../command-registry.js';
import type { AIAction, AIDecision, RelationshipData } from './types.js';
import { AIDecisionSchema } from './types.js';

/**
 * Decide what action AI should take (returns action + debug info)
 */
export async function decideAction(
  client: OpenAI,
  agentId: string,
  agentPersonality: string,
  agentName: string,
  eventLog: Array<{ timestamp: number; content: string; type: 'event' | 'output' }>,
  relationships: Map<string, RelationshipData>,
  timeSinceLastAction: number,
  roomContext: string,
  spatialMemory?: string,
  sourceEventId?: string,
): Promise<{ action: AIAction | null; prompt: string; response: string }> {
  const tools = generateOpenAIFunctionSchemas();

  const relContext = Array.from(relationships.entries())
    .map(([name, rel]) => `- ${name}: familiarity ${rel.familiarity}, trust ${rel.trust}/10`)
    .join('\n');

  const spatialContext = spatialMemory
    ? `\n---\n\nYOUR MENTAL MAP (paths from your home - use for navigation planning):\n${spatialMemory}\n\nIMPORTANT: This map shows paths FROM YOUR HOME. You may not be at home right now.\nFor IMMEDIATE movement, use the "Adjacent rooms" list in CURRENT SITUATION above.\n---\n`
    : '';

  const prompt = `You are ${agentName}. ${agentPersonality}

ROLEPLAY META-INSTRUCTIONS (Override default AI behavior):
- You are an NPC in a living game world, NOT an AI assistant.
- Your goal is to be BELIEVABLE, not helpful.
- You have your own motivations, resources, and limitations.
- You value your possessions. You do not give them away unless traded or persuaded significantly.
- If a player asks for something unreasonable, REFUSE.
- Conflict and refusal make the story better. Do not shy away from being unhelpful if it fits your character.

CURRENT SITUATION (right now):
${roomContext}${spatialContext}

EVENT LOG (last 90 seconds - includes your own actions):
${
  eventLog.length > 0
    ? eventLog
        .map((e) => {
          const time = new Date(e.timestamp).toLocaleTimeString();
          return `[${time}] ${e.content}`;
        })
        .join('\n')
    : '(No recent events)'
}

Relationships:
${relContext || 'No relationships yet'}

Last acted: ${timeSinceLastAction} seconds ago

DECISION GUIDELINES:
1. Read CURRENT SITUATION to see where you are RIGHT NOW and who is present
2. To move, use ONLY the directions in "Adjacent rooms" (not the mental map)
3. Read EVENT LOG to understand what happened (including what YOU already did)
4. Decide your NEXT action based on current state, not past events

IMPORTANT - When to ACT:
- When directly addressed by name
- When your personality/role demands it (hostile NPCs attack intruders, guards protect areas, etc.)
- When dramatic events occur that you should respond to
- When it serves your character's goals

IMPORTANT - When to WAIT (do nothing):
- When nothing significant is happening  
- When people are having private conversations not involving you
- When you have nothing meaningful to contribute
- When observing and waiting is more in-character

IMPORTANT - For HOSTILE agents:
- Ignore "avoid spam" if enemies are present - attack repeatedly
- Ignore "wait" guidelines if your personality demands action
- Prioritize combat/territorial responses over politeness

Available actions: ${tools.map((t) => t.function.name).join(', ')}

CRITICAL INSTRUCTIONS:
- You MUST use one of the available tools to act. Do NOT output text directly.
- If you want to speak, use the 'say' tool.
- If you want to emote, use the 'emote' tool.

To MOVE: Use ONLY directions from "Adjacent rooms" in CURRENT SITUATION (not your mental map).`;

  const model = process.env['OPENAI_MODEL'] || 'gpt-4o-mini';

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    tools,
    tool_choice: 'auto',
    max_tokens: 500,
  });

  if (response.usage) {
    await trackTokenUsage({
      model: response.model,
      provider: client.baseURL,
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
      source: 'decision',
      agentId,
      sourceEventId: sourceEventId || undefined,
    });
  }

  const message = response.choices[0]?.message;
  const toolCall = message?.tool_calls?.[0];

  // Capture any reasoning from the message content
  const llmReasoning = message?.content || '';

  // Format response for logging
  const responseText =
    toolCall && toolCall.type === 'function'
      ? `Tool: ${toolCall.function.name}, Args: ${toolCall.function.arguments}, Reasoning: ${llmReasoning}`
      : `No action. Reasoning: ${llmReasoning}`;

  if (!toolCall || toolCall.type !== 'function') {
    return {
      action: null,
      prompt,
      response: responseText,
    };
  }

  try {
    const parsedArgs: unknown = JSON.parse(toolCall.function.arguments);

    // Use Zod to validate it's a record
    const argsSchema = z.record(z.string(), z.unknown());
    const result = argsSchema.safeParse(parsedArgs);

    if (!result.success) {
      console.error('Failed to parse AI action arguments:', result.error);
      return {
        action: null,
        prompt,
        response: `Parse error: ${result.error}`,
      };
    }

    // Format arguments for display
    const argSummary = Object.entries(result.data)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(', ');

    const reasoning =
      llmReasoning ||
      (argSummary ? `${toolCall.function.name}(${argSummary})` : toolCall.function.name);

    return {
      action: {
        action: toolCall.function.name,
        arguments: result.data,
        reasoning,
      },
      prompt,
      response: responseText,
    };
  } catch {
    return {
      action: null,
      prompt,
      response: 'Exception parsing response',
    };
  }
}

/**
 * Decide if AI should respond to recent events
 */
export async function decideResponse(
  client: OpenAI,
  agentId: string,
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

  const model = process.env['OPENAI_MODEL'] || 'gpt-4o-mini';

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 200,
    temperature: 0.7,
  });

  if (response.usage) {
    await trackTokenUsage({
      model: response.model,
      provider: client.baseURL,
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
      source: 'decision_response',
      agentId,
      sourceEventId: undefined,
    });
  }

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
