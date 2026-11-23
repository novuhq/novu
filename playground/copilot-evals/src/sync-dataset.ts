import { Client } from 'langsmith';
import { DATASET_NAME, EXAMPLES } from './dataset.ts';

const client = new Client();

const dataset = (await client.hasDataset({ datasetName: DATASET_NAME }))
  ? await client.readDataset({ datasetName: DATASET_NAME })
  : await client.createDataset(DATASET_NAME, {
      description: 'Copilot workflow tasks for comparing the direct tools against the MCP tools',
    });

const existing = new Map<string, string>();
for await (const example of client.listExamples({ datasetId: dataset.id })) {
  const key = example.metadata?.key;
  if (typeof key === 'string') existing.set(key, example.id);
}

const toCreate = EXAMPLES.filter((example) => !existing.has(example.key));
const toUpdate = EXAMPLES.filter((example) => existing.has(example.key));

for (const example of toUpdate) {
  await client.updateExample(existing.get(example.key)!, {
    inputs: example.inputs,
    outputs: example.outputs,
    metadata: { key: example.key },
  });
}

if (toCreate.length) {
  await client.createExamples(
    toCreate.map((example) => ({
      dataset_id: dataset.id,
      inputs: example.inputs,
      outputs: example.outputs,
      metadata: { key: example.key },
    }))
  );
}

const stale = [...existing.keys()].filter((key) => !EXAMPLES.some((example) => example.key === key));
for (const key of stale) await client.deleteExample(existing.get(key)!);

console.log(
  `Dataset "${DATASET_NAME}": ${toCreate.length} created, ${toUpdate.length} updated, ${stale.length} removed`
);
