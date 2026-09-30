import { agents, config, type TargetAgent } from './config.ts';
import { generate } from './google.ts';
import { describeAgents } from './prompt.ts';

const DIRECT = 'direct';
const TIMEOUT_MS = 10_000;

export type Classification = { agent: string; confidence: 'high' | 'medium' | 'low' };

/** Gemini Flash-Lite picks one agent id (or `direct`) for the latest message, with a confidence. */
export async function classify(prompt: string, current: TargetAgent | undefined): Promise<Classification> {
  const system = [
    "You route an employee's latest message to exactly one option.",
    'Options:',
    describeAgents({ withIds: true }),
    `- ${DIRECT}: Answer directly: greetings, help, which agents exist, small talk`,
    `Current agent: ${current ? `${current.id} (${current.name})` : 'none'}.`,
    'Short follow-ups to the current agent (answers to its question, "Start Research", refinements) belong to the current agent.',
    'confidence: "high" only when the message explicitly names a subject or task that exactly one option covers. ' +
      '"medium" when it plausibly fits one option but the subject is implied, vague, or could fit another option ' +
      '(for example "Give me an overview of last month." does not say an overview of what). "low" when unclear. ' +
      'Details the chosen agent asks for itself (a month, a date range) do not lower confidence.',
  ].join('\n');

  const raw = await generate(
    config.classifierModel,
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            agent: { type: 'STRING', enum: [...agents.map((agent) => agent.id), DIRECT] },
            confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
          },
          required: ['agent', 'confidence'],
        },
        temperature: 0,
        thinkingConfig: { thinkingLevel: 'MINIMAL' },
      },
    },
    TIMEOUT_MS
  );

  return JSON.parse(raw);
}
