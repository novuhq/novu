import { type Config, DIRECT, type TargetAgent } from '../config.ts';
import type { Scores } from './policy.ts';

const TIMEOUT_MS = 3_000;

export type ClassifierInput = {
  text: string;
  current: TargetAgent | undefined;
  history: string[];
  agents: TargetAgent[];
};

export const DIRECT_DESCRIPTION = 'Answer directly: greetings, help, which agents exist, small talk';

export async function scoreWithJev(config: Config, input: ClassifierInput): Promise<Scores> {
  if (!config.jevApiKey) throw new Error('JEV_API_KEY is not set');

  const criteria: Record<string, string> = Object.fromEntries(
    input.agents.map((agent) => [agent.id, `${agent.name}: ${agent.description}`])
  );
  criteria[DIRECT] = DIRECT_DESCRIPTION;

  const state = [
    `Latest user message: ${input.text}`,
    `Current agent: ${input.current ? input.current.name : 'none'}`,
    ...(input.history.length ? ['Recent conversation:', ...input.history] : []),
  ].join('\n');

  const res = await fetch(config.jevApiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.jevApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      state,
      questions: {
        route: {
          type: 'choice',
          instructions:
            'Which agent should handle the latest user message? Short follow-ups to the current agent ' +
            '(answers to its question, "Start Research", refinements) belong to the current agent.',
          criteria,
        },
      },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Jev HTTP ${res.status}: ${body.slice(0, 300)}`);

  const route = (JSON.parse(body) as { answers?: { route?: { probabilities?: unknown; choice?: unknown; confidence?: unknown } } })
    .answers?.route;
  const probabilities = route?.probabilities;
  if (!probabilities || typeof probabilities !== 'object') throw new Error(`Jev response has no route probabilities: ${body.slice(0, 300)}`);
  for (const value of Object.values(probabilities)) {
    if (typeof value !== 'number') throw new Error(`Jev probability is not a number: ${body.slice(0, 300)}`);
  }

  return {
    source: 'jev',
    probabilities: probabilities as Record<string, number>,
    choice: typeof route?.choice === 'string' ? route.choice : undefined,
    confidence: typeof route?.confidence === 'number' ? route.confidence : undefined,
  };
}
