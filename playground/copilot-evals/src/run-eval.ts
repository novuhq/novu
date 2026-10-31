import { Client } from 'langsmith';
import { evaluate } from 'langsmith/evaluation';
import type { ExampleInputs } from './dataset.ts';
import { apiTraceMetrics, type TargetOutputs, toolUsage, workflowChecks } from './evaluators.ts';
import { createChat, deleteWorkflow, getChat, getWorkflow, sendTurn } from './novu.ts';

const [variant, ...flags] = process.argv.slice(2);
const repsFlag = flags.indexOf('--reps');
const reps = repsFlag === -1 ? 1 : Number(flags[repsFlag + 1]);
if ((variant !== 'direct' && variant !== 'mcp') || !Number.isInteger(reps) || reps < 1) {
  console.error('Usage: node --env-file=.env src/run-eval.ts <direct|mcp> [--reps N]');
  process.exit(1);
}

const datasetName = process.env.EVAL_DATASET ?? 'copilot-workflow-tools';
const apiTraceProject = process.env[`API_TRACE_PROJECT_${variant.toUpperCase()}`] ?? `copilot-${variant}`;
const keepWorkflows = process.env.KEEP_WORKFLOWS === 'true';

async function runCopilot(inputs: ExampleInputs): Promise<TargetOutputs> {
  const outputs: TargetOutputs = { workflow: null, turns: [], toolSequence: [], toolCalls: 0, toolErrors: 0 };

  try {
    const chat = await createChat();
    outputs.chatId = chat._id;

    for (const prompt of inputs.turns) {
      const startedAt = Date.now();
      const turn = await sendTurn(chat._id, prompt);
      outputs.turns.push({
        prompt,
        text: turn.text,
        seconds: (Date.now() - startedAt) / 1000,
        streamError: turn.streamError,
        // Tool outputs are full workflows; the trace in the API project has them if needed.
        toolCalls: turn.toolCalls.map(({ toolName, input, error }) => ({ toolName, input, error })),
      });
      outputs.toolSequence.push(...turn.toolCalls.map((call) => call.toolName));
      outputs.toolCalls += turn.toolCalls.length;
      outputs.toolErrors += turn.toolCalls.filter((call) => call.error).length;
      if (turn.streamError) break;
    }

    const { resourceId } = await getChat(chat._id);
    if (resourceId) {
      outputs.workflow = await getWorkflow(resourceId);
      if (!keepWorkflows) await deleteWorkflow(outputs.workflow.id);
    }
  } catch (error) {
    outputs.error = error instanceof Error ? error.message : String(error);
  }

  return outputs;
}

const client = new Client();

console.log(
  `Running "${datasetName}" ×${reps} against the ${variant} tools (API traces: ${apiTraceProject})`
);

const results = await evaluate(runCopilot, {
  client,
  data: datasetName,
  evaluators: [workflowChecks, toolUsage, apiTraceMetrics(client, apiTraceProject, variant)],
  experimentPrefix: `copilot-${variant}`,
  description: `Copilot workflow tools: ${variant}`,
  metadata: { variant, apiTraceProject, apiUrl: process.env.NOVU_API_URL ?? 'http://localhost:3000' },
  maxConcurrency: Number(process.env.EVAL_CONCURRENCY ?? 1),
  numRepetitions: reps,
});

console.log(`Done: ${results.experimentName}. Compare it with the other variant in LangSmith → Datasets → ${datasetName}.`);
