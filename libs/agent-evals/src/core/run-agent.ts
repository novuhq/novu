import fs from 'node:fs/promises';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, type ModelMessage, stepCountIs } from 'ai';
import { resetShellCounter } from './mock-shell.js';
import { RunRecorder } from './recorder.js';
import { createHarnessContext, createHarnessTools } from './tools.js';
import type { EvalScenario, ParsedCommand, RunResult, Suite } from './types.js';

export type RunAgentOptions<TParsed = ParsedCommand> = {
  suite: Suite<TParsed>;
  scenario: EvalScenario<TParsed>;
  model: string;
  maxSteps?: number;
};

const DEFAULT_PREAMBLE = [
  'You are an AI coding agent executing the following playbook exactly.',
  'Follow the playbook precisely. Use the provided tools.',
  'You are running in a Claude Code-like environment with Bash, BashOutput, AskUserQuestion, and Read tools.',
  'Read any relevant fixture files in the workspace before acting.',
].join('\n');

const docCache = new Map<string, string>();

async function resolveSystemPrompt(suite: Suite): Promise<string> {
  const preamble = suite.systemPromptPreamble ?? DEFAULT_PREAMBLE;

  if ('text' in suite.systemPrompt) {
    return [preamble, '', suite.systemPrompt.text].join('\n');
  }

  const docPath = suite.systemPrompt.path;
  let playbook = docCache.get(docPath);

  if (!playbook) {
    playbook = await fs.readFile(docPath, 'utf8');
    docCache.set(docPath, playbook);
  }

  return [preamble, '', playbook].join('\n');
}

function shouldInjectFollowUp<TParsed>(
  result: { text: string; steps: Array<{ toolResults?: Array<{ output?: unknown }> }> },
  suite: Suite<TParsed>,
  scenario: EvalScenario<TParsed>
): boolean {
  if (!scenario.followUpMessages?.length) {
    return false;
  }

  if (suite.followUpTextPattern?.test(result.text)) {
    return true;
  }

  if (!scenario.followUpOnOptionId) {
    return false;
  }

  return result.steps.some((step) =>
    step.toolResults?.some((toolResult) => {
      const output = toolResult.output as { selectedId?: string } | undefined;

      return output?.selectedId === scenario.followUpOnOptionId;
    })
  );
}

export async function runAgentScenario<TParsed = ParsedCommand>(options: RunAgentOptions<TParsed>): Promise<RunResult> {
  resetShellCounter();

  const recorder = new RunRecorder(options.scenario.id, options.scenario.userPrompt);
  const context = createHarnessContext(options.suite, options.scenario, recorder);
  const tools = createHarnessTools(context);
  const system = await resolveSystemPrompt(options.suite as Suite);

  const messages: ModelMessage[] = [{ role: 'user', content: options.scenario.userPrompt }];
  const followUps = [...(options.scenario.followUpMessages ?? [])];

  // One turn for the initial prompt plus one per scripted follow-up message.
  const maxTurns = followUps.length + 1;

  for (let turn = 0; turn < maxTurns; turn += 1) {
    if (maxTurns > 1) {
      console.log(`    ↳ ${options.scenario.id}: agent turn ${turn + 1}/${maxTurns}…`);
    }

    const result = await generateText({
      model: anthropic(options.model),
      system,
      messages,
      tools,
      stopWhen: stepCountIs(options.maxSteps ?? 40),
    });

    console.log(
      `    ↳ ${options.scenario.id}: model responded (${result.steps.length} step${result.steps.length === 1 ? '' : 's'})`
    );

    recorder.recordAssistantMessage(result.text);
    messages.push(...result.response.messages);

    if (followUps.length > 0 && shouldInjectFollowUp(result, options.suite, options.scenario)) {
      const nextMessage = followUps.shift();

      if (nextMessage) {
        messages.push({ role: 'user', content: nextMessage });
      }

      continue;
    }

    break;
  }

  return recorder.build();
}
