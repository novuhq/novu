// Owner script: list the engine's registered agents with ADC and write the fixed candidate list.
// Usage: node scripts/write-agent-list.ts [--out agents.json]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadAgents, type TargetAgent } from '../src/config.ts';
import { googleJson } from '../src/google-auth.ts';

type RegisteredAgent = {
  name: string;
  displayName?: string;
  description?: string;
  state?: string;
  a2aAgentDefinition?: { jsonAgentCard?: string };
  managedAgentDefinition?: unknown;
};

const { values } = parseArgs({ options: { out: { type: 'string' } } });
const out = path.resolve(values.out ?? process.env.AGENTS_FILE ?? './agents.json');
const project = process.env.GOOGLE_CLOUD_PROJECT;
const engine = process.env.GE_ENGINE;
if (!project || !engine) throw new Error('GOOGLE_CLOUD_PROJECT and GE_ENGINE are required');

const registered: RegisteredAgent[] = [];
let pageToken: string | undefined;
do {
  const url = new URL(`https://discoveryengine.googleapis.com/v1alpha/${engine}/assistants/default_assistant/agents`);
  if (pageToken) url.searchParams.set('pageToken', pageToken);
  const page = await googleJson<{ agents?: RegisteredAgent[]; nextPageToken?: string }>('GET', url.toString(), project, undefined, 30_000);
  registered.push(...(page.agents ?? []));
  pageToken = page.nextPageToken;
} while (pageToken);

// Keep local ids that were hand-picked in an existing file (e.g. `sales`).
const existingIds = new Map<string, string>();
if (existsSync(out)) for (const entry of loadAgents(out)) existingIds.set(entry.targetId, entry.id);

const entries: TargetAgent[] = [];
const skipped: Array<{ name: string; reason: string }> = [];
for (const agent of registered) {
  const targetId = agent.name.split('/').at(-1)!;
  const label = agent.displayName ?? targetId;
  if (agent.state !== 'ENABLED') {
    skipped.push({ name: label, reason: `state ${agent.state}` });
    continue;
  }

  let forwardPath: TargetAgent['path'];
  let card: { name?: string; description?: string } = {};
  if (agent.a2aAgentDefinition) {
    forwardPath = 'a2a_proxy';
    try {
      card = JSON.parse(agent.a2aAgentDefinition.jsonAgentCard ?? '{}');
    } catch {
      // registration description still works
    }
  } else if (targetId === 'deep_research') {
    forwardPath = 'stream_assist';
  } else {
    skipped.push({ name: label, reason: 'not forwardable (only A2A agents and Deep Research)' });
    continue;
  }

  entries.push({
    id: existingIds.get(targetId) ?? slug(label, entries),
    name: agent.displayName ?? card.name ?? targetId,
    description: agent.description ?? card.description ?? label,
    path: forwardPath,
    targetId,
  });
}

writeFileSync(out, `${JSON.stringify(entries, null, 2)}\n`);
loadAgents(out);
console.log(JSON.stringify({ wrote: out, agents: entries.map((e) => `${e.id}:${e.path}:${e.targetId}`), skipped }, null, 2));

function slug(label: string, taken: TargetAgent[]): string {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'a_$1').slice(0, 28) || 'agent';
  let id = base === 'direct' ? 'direct_agent' : base;
  for (let n = 2; taken.some((e) => e.id === id) || [...existingIds.values()].includes(id); n += 1) id = `${base}_${n}`;

  return id;
}
