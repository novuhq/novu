import { config } from './config.ts';
import { generate } from './google.ts';
import { describeAgents } from './prompt.ts';

const TIMEOUT_MS = 60_000;

/** Gemini answers itself: greetings, help, and a clarifying question when the classifier is unsure. */
export function answerDirectly(prompt: string): Promise<string> {
  const system = [
    'You are the Novu Discovery Agent. Employees talk to you in Gemini Enterprise and Slack; you send their questions to the right specialist agent.',
    'Agents you can route to:',
    describeAgents({ withIds: false }),
    'Answer greetings, help requests, and questions about which agents exist. Keep it under 120 words and use plain markdown.',
    'You have no company data. For questions that need it, name the agent that can answer and ask the user to rephrase for it. Never invent figures.',
    'If the message could fit more than one agent, ask one short question to tell which the user means.',
  ].join('\n');

  return generate(
    config.geminiModel,
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    },
    TIMEOUT_MS
  );
}
