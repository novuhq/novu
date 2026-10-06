import type { AgentHandlerContext } from '@novu/framework/express';
import { agentById, agents, config, type TargetAgent } from './config.ts';
import { forward } from './forward/index.ts';
import { generate } from './google.ts';
import { log } from './log.ts';

/** Too slow to wait for inside one combined answer (Deep Research ~8 min, NYT ~1 min). */
const SLOW_AGENTS = new Set(['deep_research', 'nyt_news']);
const PLAN_TIMEOUT_MS = 15_000;
const MERGE_TIMEOUT_MS = 60_000;

type Step = { target: TargetAgent; request: string };

/**
 * Asks several agents in parallel and replies with one merged briefing.
 * Returns false (nothing sent) when the plan needs fewer than two agents.
 */
export async function answerFromSeveral(ctx: AgentHandlerContext, prompt: string): Promise<boolean> {
  const started = Date.now();
  const steps = await plan(prompt);
  if (steps.length < 2) return false;

  const names = steps.map((step) => step.target.name.replace(/ \(.*\)$/, ''));
  await ctx.typing(`Asking ${names.slice(0, -1).join(', ')} and ${names.at(-1)}…`);

  const answers = await Promise.all(steps.map(ask));
  log('fan_out', {
    conversationId: ctx.conversation.identifier,
    targets: answers.map(({ target, answered, ms }) => ({ target: target.id, answered, ms })),
    ms: Date.now() - started,
  });

  await ctx.reply(`**Discovery Agent** (asked ${names.join(', ')}):\n\n${await merge(prompt, answers)}`);

  return true;
}

async function plan(prompt: string): Promise<Step[]> {
  const options = agents.filter((agent) => !SLOW_AGENTS.has(agent.id));
  const system = [
    "Split the employee's latest message into 2-3 requests, each for exactly one of these agents:",
    options.map((agent) => `- ${agent.id}: ${agent.name} — ${agent.description}`).join('\n'),
    'If the message names agents to ask, use exactly those and ask each the question in terms of what its description covers ' +
      '(for example "how did Q2 go" becomes a Q2 quarterly summary for an analyst and Q2 revenue for finance). ' +
      'Otherwise pick the agent whose description explicitly names the subject. Use each agent at most once.',
    "Each request is a short standalone question in the employee's words, plus the period or subject it needs. Do not add topics.",
  ].join('\n');

  const raw = await generate(
    config.classifierModel,
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              agent: { type: 'STRING', enum: options.map((agent) => agent.id) },
              request: { type: 'STRING' },
            },
            required: ['agent', 'request'],
          },
        },
        temperature: 0,
        thinkingConfig: { thinkingLevel: 'MINIMAL' },
      },
    },
    PLAN_TIMEOUT_MS
  );
  const planned: Array<{ agent: string; request: string }> = JSON.parse(raw);
  const steps = new Map<string, Step>();
  for (const { agent, request } of planned) {
    const target = agentById(agent);
    if (target && request.trim() && !steps.has(target.id)) steps.set(target.id, { target, request: request.trim() });
  }

  return [...steps.values()].slice(0, 3);
}

async function ask({ target, request }: Step) {
  const started = Date.now();
  try {
    // A fresh session: the agent's ongoing conversation may be waiting for an answer to its own question.
    const { text } = await forward(target, request, undefined);

    return { target, request, text: text ?? 'No answer.', answered: Boolean(text), ms: Date.now() - started };
  } catch (err) {
    log('forward_failed', { target: target.id, error: String(err), ms: Date.now() - started });

    return { target, request, text: 'Could not be reached.', answered: false, ms: Date.now() - started };
  }
}

function merge(prompt: string, answers: Array<{ target: TargetAgent; request: string; text: string }>): Promise<string> {
  const system =
    "Combine the agents' answers into one short briefing for the employee's latest message. Plain markdown, a few short sections, under 220 words. " +
    'Credit each fact to its agent in parentheses. Use only facts from the answers. ' +
    'Each agent was asked only its own request: never note what an agent did not cover, only say so when it could not answer its own request.';
  const sources = answers
    .map(({ target, request, text }) => `## ${target.name}\nAsked: ${request}\nAnswer: ${text}`)
    .join('\n\n');

  return generate(
    config.geminiModel,
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: `${prompt}\n\n# Agent answers\n\n${sources}` }] }],
    },
    MERGE_TIMEOUT_MS
  );
}
