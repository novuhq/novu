import fs from 'node:fs/promises';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, type ModelMessage, stepCountIs } from 'ai';
import { createHarness } from 'vitest-evals/harness';
import { RunRecorder } from '../../core/recorder.js';
import { createHarnessContext, createHarnessTools } from '../../core/tools.js';
import type { EvalScenario, ParsedCommand, RunResult, Suite } from '../../core/types.js';

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

function toJsonSafeRunResult(result: RunResult): RunResult {
  return JSON.parse(
    JSON.stringify(result, (_key, value) => {
      if (value === undefined) {
        return null;
      }

      return value;
    })
  ) as RunResult;
}

export type ScenarioHarnessOptions<TParsed = ParsedCommand> = {
  suite: Suite<TParsed>;
  scenario: EvalScenario<TParsed>;
  system: string;
  model?: string;
  maxSteps?: number;
  temperature?: number;
};

function resolveMaxSteps(explicit?: number): number {
  if (explicit !== undefined) {
    return explicit;
  }

  const fromEnv = Number.parseInt(process.env.NOVU_EVAL_MAX_STEPS ?? '', 10);

  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 40;
}

/**
 * Default to 0 for deterministic, reproducible grading. A non-zero default would make
 * run-to-run results depend on sampling noise, so a flaky prompt and a real regression
 * become indistinguishable. Override via NOVU_EVAL_TEMPERATURE only for robustness sampling.
 */
function resolveTemperature(explicit?: number): number {
  if (explicit !== undefined) {
    return explicit;
  }

  const fromEnv = Number.parseFloat(process.env.NOVU_EVAL_TEMPERATURE ?? '');

  return Number.isFinite(fromEnv) && fromEnv >= 0 ? fromEnv : 0;
}

export function scenarioHarness<TParsed = ParsedCommand>(options: ScenarioHarnessOptions<TParsed>) {
  const modelName = options.model ?? process.env.NOVU_EVAL_MODEL ?? 'claude-sonnet-4-5';
  const maxSteps = resolveMaxSteps(options.maxSteps);
  const temperature = resolveTemperature(options.temperature);

  return createHarness({
    name: `agent-onboarding/${options.scenario.id}`,
    run: async ({ input }) => {
      const recorder = new RunRecorder(options.scenario.id, input);
      const context = createHarnessContext(options.suite, options.scenario, recorder);
      const tools = createHarnessTools(context);
      const messages: ModelMessage[] = [{ role: 'user', content: input }];
      const followUps = [...(options.scenario.followUpMessages ?? [])];
      const maxTurns = followUps.length + 1;
      let lastResult: Awaited<ReturnType<typeof generateText>> | undefined;

      for (let turn = 0; turn < maxTurns; turn += 1) {
        lastResult = await generateText({
          model: anthropic(modelName),
          system: options.system,
          messages,
          tools,
          temperature,
          stopWhen: stepCountIs(maxSteps),
        });

        recorder.recordAssistantMessage(lastResult.text);
        messages.push(...lastResult.response.messages);

        if (followUps.length > 0 && shouldInjectFollowUp(lastResult, options.suite, options.scenario)) {
          const nextMessage = followUps.shift();

          if (nextMessage) {
            messages.push({ role: 'user', content: nextMessage });
          }

          continue;
        }

        break;
      }

      return {
        output: toJsonSafeRunResult(recorder.build()),
        usage: {
          provider: 'anthropic',
          model: modelName,
          inputTokens: lastResult?.usage?.inputTokens,
          outputTokens: lastResult?.usage?.outputTokens,
          totalTokens: lastResult?.usage?.totalTokens,
        },
      };
    },
  });
}

export async function loadSuiteSystemPrompt<TParsed>(suite: Suite<TParsed>): Promise<string> {
  return resolveSystemPrompt(suite);
}
