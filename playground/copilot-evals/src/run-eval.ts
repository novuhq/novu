import { parseArgs } from 'node:util';
import { Client } from 'langsmith';
import { evaluate } from 'langsmith/evaluation';
import { DATASET_NAME, type ExampleInputs, type StepRef, type Turn } from './dataset.ts';
import { apiTraceMetrics, type TargetOutputs, toolUsage, workflowChecks } from './evaluators.ts';
import { API_KEY_READ_REASON, API_URL, createChat, deleteWorkflow, getChat, getWorkflow, sendTurn } from './novu.ts';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { reps: { type: 'string', default: '1' } },
});
const [variant] = positionals;
const reps = Number(values.reps);
if (positionals.length !== 1 || (variant !== 'direct' && variant !== 'mcp') || !Number.isInteger(reps) || reps < 1) {
  console.error('Usage: node --env-file=.env src/run-eval.ts <direct|mcp> [--reps N]');
  process.exit(1);
}

const apiTraceProjects = [
  ...new Set([
    process.env.API_TRACE_PROJECT_DIRECT ?? 'copilot-direct',
    process.env.API_TRACE_PROJECT_MCP ?? 'copilot-mcp',
  ]),
];
const keepWorkflows = process.env.KEEP_WORKFLOWS === 'true';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** The `stepId` a focused turn sends, from the chat's workflow as it is before the turn. */
async function focusedStepId(chatId: string, { type, nth = 0 }: StepRef): Promise<string> {
  const { resourceId, identity } = await getChat(chatId);
  if (!resourceId) throw new Error(`cannot focus ${type}[${nth}]: the chat has no workflow yet`);

  const { steps } = await getWorkflow(resourceId, identity);
  const step = steps.filter((candidate) => candidate.type === type)[nth];
  if (!step) throw new Error(`cannot focus ${type}[${nth}]: the workflow has no such step`);

  return step.stepId;
}

async function runCopilot(inputs: ExampleInputs): Promise<TargetOutputs> {
  const outputs: Omit<TargetOutputs, 'toolSequence'> = { workflow: null, turns: [] };

  try {
    const chat = await createChat();
    outputs.chatId = chat._id;

    for (const turn of inputs.turns) {
      const { text, focusStep }: Turn = typeof turn === 'string' ? { text: turn } : turn;
      const stepId = focusStep && (await focusedStepId(chat._id, focusStep));
      const startedAt = Date.now();
      const result = await sendTurn(chat._id, text, stepId);
      outputs.turns.push({ prompt: text, focusedStepId: stepId, seconds: (Date.now() - startedAt) / 1000, ...result });
      if (result.streamError) break;
    }
  } catch (error) {
    outputs.error = errorMessage(error);
  }

  // Runs after a failed turn too: a leftover workflow's tags would reach every later chat's prompt as environment
  // tags. A failed run still scores as having no workflow.
  if (outputs.chatId) {
    try {
      const { resourceId, identity } = await getChat(outputs.chatId);
      if (resourceId) {
        try {
          if (!outputs.error) outputs.workflow = await getWorkflow(resourceId, identity);
        } finally {
          if (!keepWorkflows) await deleteWorkflow(resourceId);
        }
      }
    } catch (error) {
      outputs.error ??= errorMessage(error);
    }
  }

  return { ...outputs, toolSequence: outputs.turns.flatMap((turn) => turn.toolCalls.map((call) => call.toolName)) };
}

const client = new Client();

const workflowReads = API_KEY_READ_REASON
  ? `API key because ${API_KEY_READ_REASON}, so critical may be up to 60 s stale`
  : 'Internal token';
console.log(
  `Running "${DATASET_NAME}" ×${reps} against the ${variant} tools ` +
    `(API traces: ${apiTraceProjects.join(', ')}; workflow reads: ${workflowReads})`
);

const results = await evaluate(runCopilot, {
  client,
  data: DATASET_NAME,
  evaluators: [workflowChecks, toolUsage, apiTraceMetrics(client, apiTraceProjects, variant)],
  experimentPrefix: `copilot-${variant}`,
  description: `Copilot workflow tools: ${variant}`,
  metadata: { variant, apiTraceProjects, internalReads: !API_KEY_READ_REASON, apiUrl: API_URL },
  maxConcurrency: Number(process.env.EVAL_CONCURRENCY ?? 1),
  numRepetitions: reps,
});

console.log(`Done: ${results.experimentName}. Compare it with the other variant in LangSmith → Datasets → ${DATASET_NAME}.`);
