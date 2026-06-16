import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import type { GraderResult } from './types.js';

let judgeModel = 'claude-sonnet-4-5';
let judgeEnabled = false;

export function configureJudge(options: { enabled: boolean; model?: string }): void {
  judgeEnabled = options.enabled;
  judgeModel = options.model ?? judgeModel;
}

export async function runJudge(prompt: string, context: string): Promise<GraderResult> {
  if (!judgeEnabled || !process.env.ANTHROPIC_API_KEY) {
    return 'skip';
  }

  const result = await generateText({
    model: anthropic(judgeModel),
    prompt: [
      'You are grading an AI agent run against a coding-agent playbook.',
      'Answer with exactly YES or NO.',
      '',
      `Question: ${prompt}`,
      '',
      'Context:',
      context,
    ].join('\n'),
  });

  return result.text.trim().toUpperCase().startsWith('YES') ? 'pass' : 'fail';
}
