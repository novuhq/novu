import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import type { GraderOutcome, GraderResult } from './types.js';

const DEFAULT_JUDGE_MODEL = 'claude-sonnet-4-5';

export async function runJudge(prompt: string, context: string, options?: { model?: string }): Promise<GraderOutcome> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { status: 'skip' };
  }

  const model = options?.model ?? process.env.NOVU_EVAL_JUDGE_MODEL ?? DEFAULT_JUDGE_MODEL;

  const result = await generateText({
    model: anthropic(model),
    prompt: [
      'You are grading an AI agent run against a coding-agent playbook.',
      'First, write one sentence of reasoning explaining your verdict.',
      'Then, on the final line, answer with exactly YES, NO, or UNKNOWN.',
      'Answer UNKNOWN only if the context does not contain enough information to judge the question.',
      '',
      `Question: ${prompt}`,
      '',
      'Context:',
      context,
    ].join('\n'),
  });

  const lines = result.text
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const verdictLine = lines.at(-1) ?? '';
  const verdict = verdictLine.toUpperCase();
  const reason = lines.slice(0, -1).join(' ').trim() || undefined;

  // Escape hatch: a starved judge abstains instead of counting as a failure.
  if (verdict.startsWith('UNKNOWN')) {
    return { status: 'skip' };
  }

  const status: GraderResult = verdict.startsWith('YES') ? 'pass' : 'fail';

  return status === 'fail' ? { status, reason } : { status };
}
