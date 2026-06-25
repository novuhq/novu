import type { AgentContextBase } from '../resources/agent/agent.types';
import type { AiSdkResult } from './types';

function isCardElement(value: object): boolean {
  return 'type' in value && (value as { type: string }).type === 'card';
}

export function isAiSdkResult(value: unknown): value is AiSdkResult {
  if (typeof value !== 'object' || value === null || isCardElement(value)) {
    return false;
  }

  if ('textStream' in value) {
    return 'text' in value;
  }

  return 'text' in value && 'steps' in value;
}

export async function deliverResult(result: AiSdkResult, ctx: AgentContextBase): Promise<void> {
  const text = (await result.text).trim();

  if (!text) {
    return;
  }

  await ctx.reply(text);
}
