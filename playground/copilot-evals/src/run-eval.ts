import { parseArgs } from 'node:util';
import { Client } from 'langsmith';
import { evaluate } from 'langsmith/evaluation';
import { DATASET_NAME, type ExampleInputs } from './dataset.ts';
import { apiTraceMetrics, type TargetOutputs, toolUsage, workflowChecks } from './evaluators.ts';
import { API_URL, createChat, deleteWorkflow, getChat, getWorkflow, sendTurn } from './novu.ts';

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

const apiTraceProject =
  { direct: process.env.API_TRACE_PROJECT_DIRECT, mcp: process.env.API_TRACE_PROJECT_MCP }[variant] ??
  `copilot-${variant}`;
const keepWorkflows = process.env.KEEP_WORKFLOWS === 'true';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function runCopilot(inputs: ExampleInputs): Promise<TargetOutputs> {
  const outputs: Omit<TargetOutputs, 'toolSequence'> = { workflow: null, turns: [] };

  try {
    const chat = await createChat();
    outputs.chatId = chat._id;

    for (const prompt of inputs.turns) {
      const startedAt = Date.now();
      const turn = await sendTurn(chat._id, prompt);
      outputs.turns.push({ prompt, seconds: (Date.now() - startedAt) / 1000, ...turn });
      if (turn.streamError) break;
    }
  } catch (error) {
    outputs.error = errorMessage(error);
  }

  // Runs after a failed turn too: a leftover workflow's tags would reach every later chat's prompt as environment
  // tags. A failed run still scores as having no workflow.
  if (outputs.chatId) {
    try {
      const { resourceId } = await getChat(outputs.chatId);
      if (resourceId) {
        if (!outputs.error) outputs.workflow = await getWorkflow(resourceId);
        if (!keepWorkflows) await deleteWorkflow(resourceId);
      }
    } catch (error) {
      outputs.error ??= errorMessage(error);
    }
  }

  return { ...outputs, toolSequence: outputs.turns.flatMap((turn) => turn.toolCalls.map((call) => call.toolName)) };
}

const client = new Client();

console.log(`Running "${DATASET_NAME}" ×${reps} against the ${variant} tools (API traces: ${apiTraceProject})`);

const results = await evaluate(runCopilot, {
  client,
  data: DATASET_NAME,
  evaluators: [workflowChecks, toolUsage, apiTraceMetrics(client, apiTraceProject, variant)],
  experimentPrefix: `copilot-${variant}`,
  description: `Copilot workflow tools: ${variant}`,
  metadata: { variant, apiTraceProject, apiUrl: API_URL },
  maxConcurrency: Number(process.env.EVAL_CONCURRENCY ?? 1),
  numRepetitions: reps,
});

console.log(`Done: ${results.experimentName}. Compare it with the other variant in LangSmith → Datasets → ${DATASET_NAME}.`);
