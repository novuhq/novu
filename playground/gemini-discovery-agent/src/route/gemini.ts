import { type Config, DIRECT, type TargetAgent } from '../config.ts';
import { googleJson } from '../google-auth.ts';
import { type ClassifierInput, DIRECT_DESCRIPTION } from './jev.ts';
import type { Scores } from './policy.ts';

const CLASSIFIER_TIMEOUT_MS = 10_000;
const ANSWER_TIMEOUT_MS = 60_000;

type GenerateResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
};

async function generate(config: Config, model: string, request: Record<string, unknown>, timeoutMs: number): Promise<string> {
  const host = config.vertexLocation === 'global' ? 'aiplatform.googleapis.com' : `${config.vertexLocation}-aiplatform.googleapis.com`;
  const url =
    `https://${host}/v1/projects/${config.project}/locations/${config.vertexLocation}` +
    `/publishers/google/models/${model}:generateContent`;
  const response = await googleJson<GenerateResponse>('POST', url, config.project, request, timeoutMs);
  const text = (response.candidates?.[0]?.content?.parts ?? [])
    .filter((part) => !part.thought && part.text)
    .map((part) => part.text)
    .join('')
    .trim();
  if (!text) throw new Error(`${model} returned no text`);

  return text;
}

function agentList(agents: TargetAgent[], withIds: boolean): string {
  return agents.map((agent) => `- ${withIds ? `${agent.id}: ` : ''}${agent.name} — ${agent.description}`).join('\n');
}

/** Fallback router when Jev is unavailable. */
export async function classifyWithGemini(config: Config, input: ClassifierInput): Promise<Scores> {
  const ids = [...input.agents.map((agent) => agent.id), DIRECT];
  const system = [
    "You route an employee's latest message to exactly one option.",
    'Options:',
    agentList(input.agents, true),
    `- ${DIRECT}: ${DIRECT_DESCRIPTION}`,
    `Current agent: ${input.current ? `${input.current.id} (${input.current.name})` : 'none'}.`,
    'Short follow-ups to the current agent (answers to its question, "Start Research", refinements) belong to the current agent.',
    'confidence: "high" only when the message explicitly names a subject or task that exactly one option covers. ' +
      '"medium" when it plausibly fits one option but the subject is implied, vague, or could fit another option ' +
      '(for example "Give me an overview of last month." does not say an overview of what). "low" when unclear. ' +
      'Details the chosen agent asks for itself (a month, a date range) do not lower confidence.',
  ].join('\n');
  const user = [...(input.history.length ? ['Recent conversation:', ...input.history, ''] : []), `Latest message: ${input.text}`].join('\n');

  const raw = await generate(
    config,
    config.classifierModel,
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            agent: { type: 'STRING', enum: ids },
            confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
          },
          required: ['agent', 'confidence'],
        },
        temperature: 0,
        thinkingConfig: { thinkingLevel: 'MINIMAL' },
      },
    },
    CLASSIFIER_TIMEOUT_MS
  );
  const parsed = JSON.parse(raw) as { agent?: unknown; confidence?: unknown };
  const confidence = parsed.confidence;
  if (typeof parsed.agent !== 'string' || !ids.includes(parsed.agent)) throw new Error(`classifier picked unknown option: ${raw}`);
  if (confidence !== 'high' && confidence !== 'medium' && confidence !== 'low') throw new Error(`classifier confidence invalid: ${raw}`);

  return { source: 'gemini', choice: parsed.agent, confidence };
}

export async function answerDirectly(config: Config, text: string, history: string[], agents: TargetAgent[]): Promise<string> {
  const system = [
    'You are the Novu Discovery Agent. Employees talk to you in Gemini Enterprise and Slack; you send their questions to the right specialist agent.',
    'Agents you can route to:',
    agentList(agents, false),
    'Answer greetings, help requests, and questions about which agents exist. Keep it under 120 words and use plain markdown.',
    'You have no company data. For questions that need it, name the agent that can answer and ask the user to rephrase for it. Never invent figures.',
  ].join('\n');
  const user = [...(history.length ? ['Recent conversation:', ...history, ''] : []), text].join('\n');

  return generate(
    config,
    config.geminiModel,
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
    },
    ANSWER_TIMEOUT_MS
  );
}
